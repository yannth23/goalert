import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TelegramService } from '../telegram/telegram.service';
import { ScraperService, ScrapedMatch } from './scraper.service';
import { translateTeam } from './translation.util';
import { withCache } from '../shared';

const BASE_URL       = 'https://api.football-data.org/v4';
const COMPETITION_WC = 'WC';
const AXIOS_TIMEOUT  = 8_000;

const STATUS_MAP: Record<string, string> = {
  SCHEDULED:        'NS',
  TIMED:            'NS',
  IN_PLAY:          '1H',
  PAUSED:           'HT',
  EXTRA_TIME:       'ET',
  PENALTY_SHOOTOUT: 'PEN',
  FINISHED:         'FT',
  SUSPENDED:        'PST',
  POSTPONED:        'PST',
  CANCELLED:        'PST',
  AWARDED:          'FT',
};

function extractScore(score: any): { home: number | null; away: number | null } {
  const candidates = [score?.fullTime, score?.regularTime, score?.halfTime];
  for (const c of candidates) {
    if (c?.home !== null && c?.home !== undefined) return { home: c.home, away: c.away };
  }
  return { home: null, away: null };
}

/** Fetch from football-data.org with timeout + one retry on network/timeout errors. */
async function fetchWithRetry(url: string, params: object, headers: object, logger: Logger) {
  const opts = { params, headers, timeout: AXIOS_TIMEOUT };
  try {
    return await axios.get(url, opts);
  } catch (firstErr: any) {
    const isRetryable =
      firstErr.code === 'ECONNABORTED' ||
      firstErr.code === 'ERR_CANCELED'  ||
      firstErr.code === 'ENOTFOUND'     ||
      firstErr.code === 'ECONNRESET';
    if (!isRetryable) throw firstErr;
    logger.warn(`Primary fetch failed (${firstErr.code}), retrying in 3 s…`);
    await new Promise(r => setTimeout(r, 3_000));
    return axios.get(url, opts);
  }
}

@Injectable()
export class FootballApiService {
  private readonly logger = new Logger(FootballApiService.name);

  constructor(
    private readonly prisma:   PrismaService,
    private readonly redis:    RedisService,
    private readonly telegram: TelegramService,
    private readonly scraper:  ScraperService,
  ) {}

  private get headers() {
    return { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY };
  }

  private async cacheDel(key: string) {
    try { await this.redis.del(key); }
    catch (err) { this.logger.warn(`Cache DEL failed [${key}]`, err); }
  }

  // ── Main sync ──────────────────────────────────────────────────────────────

  async syncTodayMatches() {
    const today = new Date().toISOString().split('T')[0];

    // ── Try primary API ────────────────────────────────────────────────────
    try {
      const response = await fetchWithRetry(
        `${BASE_URL}/matches`,
        { date: today },
        this.headers,
        this.logger,
      );

      return await this.processPrimaryMatches(response.data.matches ?? [], today);

    } catch (primaryErr: any) {
      // ── Fallback: scraper ────────────────────────────────────────────────
      this.logger.warn(
        `Primary API unavailable (${primaryErr.message}) — activating scraper fallback`,
      );

      try {
        const scraped = await this.scraper.scrapeTodayMatches();

        if (scraped.length === 0) {
          this.logger.warn('Scraper returned 0 matches — both data sources failed');
          return { synced: 0, live: 0, errors: 1, source: 'none' };
        }

        const { updated, live } = await this.updateFromScraped(scraped);
        await this.cacheDel(`matches:${today}`);

        this.logger.log(
          `Scraper fallback OK — ${updated} updated, ${live} live [source: ${scraped[0]?.source}]`,
        );
        return { synced: updated, live, errors: 0, source: scraped[0]?.source ?? 'scraper' };

      } catch (scraperErr: any) {
        this.logger.error(`Scraper also failed: ${scraperErr.message}`);
        return { synced: 0, live: 0, errors: 1, source: 'none' };
      }
    }
  }

  // ── Primary API processing (unchanged logic) ────────────────────────────

  private async processPrimaryMatches(matches: any[], today: string) {
    let syncErrors = 0;
    let liveCount  = 0;

    for (const match of matches) {
      try {
        let mappedStatus = STATUS_MAP[match.status] ?? match.status;

        if (
          match.status === 'IN_PLAY' &&
          match.score?.halfTime?.home !== null &&
          match.score?.halfTime?.home !== undefined
        ) {
          mappedStatus = '2H';
        }

        const { home: homeScore, away: awayScore } = extractScore(match.score);
        const homeTeam = translateTeam(match.homeTeam.name);
        const awayTeam = translateTeam(match.awayTeam.name);

        const existing = await this.prisma.footballMatch.findUnique({
          where: { externalId: match.id.toString() },
        });

        const saved = await this.prisma.footballMatch.upsert({
          where:  { externalId: match.id.toString() },
          update: { status: mappedStatus, homeScore, awayScore },
          create: {
            externalId:   match.id.toString(),
            date:         new Date(match.utcDate),
            championship: match.competition.name,
            homeTeam,
            awayTeam,
            status:       mappedStatus,
            homeScore,
            awayScore,
          },
        });

        if (['1H', 'HT', '2H', 'ET', 'PEN'].includes(mappedStatus)) liveCount++;
        await this.detectAndNotify(existing, saved, homeTeam, awayTeam);

      } catch (err) {
        syncErrors++;
        this.logger.error(`Failed to sync match ${match.id}`, err);
      }
    }

    await this.cacheDel(`matches:${today}`);

    if (liveCount > 0 || syncErrors > 0) {
      this.logger.log(
        `Primary sync — ${matches.length} total, ${liveCount} live, ${syncErrors} error(s)`,
      );
    }

    return { synced: matches.length, live: liveCount, errors: syncErrors, source: 'primary' };
  }

  // ── Scraper fallback: update existing DB records ──────────────────────────

  private async updateFromScraped(
    scraped: ScrapedMatch[],
  ): Promise<{ updated: number; live: number }> {
    let updated   = 0;
    let liveCount = 0;

    for (const s of scraped) {
      try {
        const startDay   = s.startTime.toISOString().split('T')[0];
        const dayStart   = new Date(`${startDay}T00:00:00Z`);
        const dayEnd     = new Date(`${startDay}T23:59:59Z`);

        // Match by translated team names + date — never create new records here
        const existing = await this.prisma.footballMatch.findFirst({
          where: {
            homeTeam: s.homeTeam,
            awayTeam: s.awayTeam,
            date: { gte: dayStart, lte: dayEnd },
          },
        });

        if (!existing) continue;

        const updated_record = await this.prisma.footballMatch.update({
          where: { id: existing.id },
          data: {
            status:    s.status,
            homeScore: s.homeScore,
            awayScore: s.awayScore,
          },
        });

        await this.detectAndNotify(existing, updated_record, s.homeTeam, s.awayTeam);

        updated++;
        if (['1H', 'HT', '2H', 'ET', 'PEN'].includes(s.status)) liveCount++;

      } catch (err) {
        this.logger.error(
          `[scraper] Failed to update ${s.homeTeam} vs ${s.awayTeam}`,
          err,
        );
      }
    }

    return { updated, live: liveCount };
  }

  // ── Telegram notifications (unchanged) ────────────────────────────────────

  private async detectAndNotify(prev: any, curr: any, homeTeam: string, awayTeam: string) {
    const users = await this.prisma.user.findMany({
      where: { preferences: { receiveTelegramNotifications: true } },
      include: { preferences: true },
    });
    if (!users.length) return;

    const messages: string[] = [];

    if (prev?.status === 'NS' && curr.status === '1H') {
      messages.push(
        `⚽ *Jogo começou!*\n${homeTeam} x ${awayTeam}\n🏆 ${curr.championship}`,
      );
    }

    const prevHome = prev?.homeScore ?? null;
    const prevAway = prev?.awayScore ?? null;
    const currHome = curr.homeScore;
    const currAway = curr.awayScore;
    const placarMudou =
      currHome !== null &&
      currAway !== null &&
      (currHome !== prevHome || currAway !== prevAway);

    if (placarMudou) {
      const golsHome = currHome - (prevHome ?? 0);
      const golsAway = currAway - (prevAway ?? 0);
      for (let i = 0; i < golsHome; i++) {
        const ph = (prevHome ?? 0) + i + 1;
        const pa = prevAway ?? 0;
        messages.push(`🥅 *GOL!* ${homeTeam}\n${homeTeam} ${ph} x ${pa} ${awayTeam}\n🏆 ${curr.championship}`);
      }
      for (let i = 0; i < golsAway; i++) {
        const ph = prevHome ?? 0;
        const pa = (prevAway ?? 0) + i + 1;
        messages.push(`🥅 *GOL!* ${awayTeam}\n${homeTeam} ${ph} x ${pa} ${awayTeam}\n🏆 ${curr.championship}`);
      }
    }

    if (prev && prev.status !== 'FT' && curr.status === 'FT') {
      messages.push(
        `🏁 *Fim de jogo!*\n${homeTeam} ${curr.homeScore ?? 0} x ${curr.awayScore ?? 0} ${awayTeam}\n🏆 ${curr.championship}`,
      );
    }

    if (!messages.length) return;

    for (const user of users) {
      const chatId = user.preferences?.telegramChatId;
      if (!chatId) continue;
      for (const msg of messages) {
        try { await this.telegram.sendMessage(chatId, msg); }
        catch (err) { this.logger.error(`Telegram failed chatId=${chatId}`, err); }
      }
    }
  }

  // ── Standings & Scorers (cached) ───────────────────────────────────────────

  async getStandings() {
    return withCache(this.redis, 'standings:wc', 300, async () => {
      const response = await fetchWithRetry(
        `${BASE_URL}/competitions/${COMPETITION_WC}/standings`,
        {},
        this.headers,
        this.logger,
      );
      return (response.data.standings as any[]).map((group) => ({
        group: group.group ?? group.stage,
        table: group.table.map((entry: any) => ({
          position:       entry.position,
          teamId:         entry.team.id,
          teamName:       translateTeam(entry.team.name),
          crest:          entry.team.crest,
          points:         entry.points,
          played:         entry.playedGames,
          wins:           entry.won,
          draws:          entry.draw,
          losses:         entry.lost,
          goalsFor:       entry.goalsFor,
          goalsAgainst:   entry.goalsAgainst,
          goalDifference: entry.goalDifference,
        })),
      }));
    });
  }

  async getTopScorers() {
    return withCache(this.redis, 'scorers:wc:top10', 300, async () => {
      const response = await fetchWithRetry(
        `${BASE_URL}/competitions/${COMPETITION_WC}/scorers`,
        { limit: 10 },
        this.headers,
        this.logger,
      );
      return (response.data.scorers as any[]).map((entry) => ({
        playerId:   entry.player.id,
        playerName: entry.player.name,
        teamName:   entry.team?.name ? translateTeam(entry.team.name) : '—',
        goals:      entry.goals ?? 0,
        assists:    entry.assists ?? 0,
      }));
    });
  }
}
