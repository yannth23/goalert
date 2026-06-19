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
const FAILURE_THRESHOLD   = 3;
const ALERT_COOLDOWN_SECS = 1800; // 30 min between repeated alerts

const SOURCE_LABELS: Record<string, string> = {
  primary:   'football-data.org (API principal)',
  sofascore: 'SofaScore (fallback 1)',
  espn:      'ESPN (fallback 2)',
  none:      '— nenhuma fonte disponível',
};

const STATUS_MAP: Record<string, string> = {
  SCHEDULED: 'NS', TIMED: 'NS', IN_PLAY: '1H', PAUSED: 'HT',
  EXTRA_TIME: 'ET', PENALTY_SHOOTOUT: 'PEN', FINISHED: 'FT',
  SUSPENDED: 'PST', POSTPONED: 'PST', CANCELLED: 'PST', AWARDED: 'FT',
};

function extractScore(score: any): { home: number | null; away: number | null } {
  for (const c of [score?.fullTime, score?.regularTime, score?.halfTime]) {
    if (c?.home !== null && c?.home !== undefined) return { home: c.home, away: c.away };
  }
  return { home: null, away: null };
}

async function fetchWithRetry(url: string, params: object, headers: object, logger: Logger) {
  const opts = { params, headers, timeout: AXIOS_TIMEOUT };
  try {
    return await axios.get(url, opts);
  } catch (firstErr: any) {
    const retryable = ['ECONNABORTED','ERR_CANCELED','ENOTFOUND','ECONNRESET'].includes(firstErr.code);
    if (!retryable) throw firstErr;
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

  private get headers() { return { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY }; }
  private async cacheDel(key: string) { try { await this.redis.del(key); } catch { } }

  // ── Admin Telegram notification ───────────────────────────────────────────
  private async notifyAdmin(message: string): Promise<void> {
    const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
    if (!chatId) {
      this.logger.warn('[admin-alert] ADMIN_TELEGRAM_CHAT_ID not set — skipping notification');
      return;
    }
    try {
      await this.telegram.sendMessage(chatId, message);
      this.logger.log('[admin-alert] sent');
    } catch (err) {
      this.logger.error('[admin-alert] failed to send', err);
    }
  }

  // ── Persist sync result + handle admin alerts ─────────────────────────────
  private async trackSyncResult(r: { source: string; synced: number; live: number; errors: number }) {
    const today = new Date().toISOString().split('T')[0];

    // Save last result snapshot
    await this.redis.setJson('sync:last_result', { ts: new Date().toISOString(), ...r }, 600).catch(() => {});

    // Daily error counter
    if (r.errors > 0) {
      const errKey = `sync:errors:${today}`;
      const cur = parseInt((await this.redis.get(errKey).catch(() => null)) ?? '0', 10);
      await this.redis.set(errKey, String(cur + r.errors), 86400).catch(() => {});
    }

    // Consecutive failure counter + admin alerts
    const failKey = 'sync:consecutive_failures';
    const cur     = parseInt((await this.redis.get(failKey).catch(() => null)) ?? '0', 10);
    const nowPT   = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

    if (r.source === 'none') {
      // ── Failure path ──
      const newCount = cur + 1;
      await this.redis.set(failKey, String(newCount), 7200).catch(() => {});

      if (newCount >= FAILURE_THRESHOLD) {
        const alreadyAlerted = await this.redis.get('sync:alert_sent').catch(() => null);
        if (!alreadyAlerted) {
          await this.notifyAdmin(
            `🚨 *GoalAlert — Falha de Sincronização*\n` +
            `Todas as fontes de dados falharam *${newCount}x* seguidas.\n` +
            `O placar pode estar desatualizado.\n\n` +
            `🕐 ${nowPT} (horário de Brasília)\n` +
            `\n_Próximo alerta em 30 min se persistir._`,
          );
          await this.redis.set('sync:alert_sent', '1', ALERT_COOLDOWN_SECS).catch(() => {});
        }
      }
    } else {
      // ── Recovery path ──
      if (cur >= FAILURE_THRESHOLD) {
        // Only notify recovery if an alert was previously sent
        const wasAlerted = await this.redis.get('sync:alert_sent').catch(() => null);
        if (wasAlerted) {
          await this.notifyAdmin(
            `✅ *GoalAlert — Sincronização Recuperada*\n` +
            `Fonte ativa: *${SOURCE_LABELS[r.source] ?? r.source}*\n` +
            `Após *${cur}* falha(s) consecutiva(s).\n\n` +
            `🕐 ${nowPT} (horário de Brasília)`,
          );
          await this.redis.del('sync:alert_sent').catch(() => {});
        }
      }
      await this.redis.set(failKey, '0', 7200).catch(() => {});
    }
  }

  // ── Main sync ─────────────────────────────────────────────────────────────
  async syncTodayMatches() {
    const today = new Date().toISOString().split('T')[0];

    try {
      const response = await fetchWithRetry(`${BASE_URL}/matches`, { date: today }, this.headers, this.logger);
      const result = await this.processPrimaryMatches(response.data.matches ?? [], today);
      await this.trackSyncResult(result);
      return result;
    } catch (primaryErr: any) {
      this.logger.warn(`Primary API down (${primaryErr.message}) — scraper fallback`);
      try {
        const scraped = await this.scraper.scrapeTodayMatches();
        if (scraped.length === 0) {
          const result = { synced: 0, live: 0, errors: 1, source: 'none' };
          await this.trackSyncResult(result);
          return result;
        }
        const { updated, live } = await this.updateFromScraped(scraped);
        await this.cacheDel(`matches:${today}`);
        const result = { synced: updated, live, errors: 0, source: scraped[0]?.source ?? 'scraper' };
        this.logger.log(`Scraper OK — ${updated} updated, ${live} live [${result.source}]`);
        await this.trackSyncResult(result);
        return result;
      } catch (scraperErr: any) {
        const result = { synced: 0, live: 0, errors: 1, source: 'none' };
        this.logger.error(`Scraper also failed: ${scraperErr.message}`);
        await this.trackSyncResult(result);
        return result;
      }
    }
  }

  private async processPrimaryMatches(matches: any[], today: string) {
    let syncErrors = 0, liveCount = 0;
    for (const match of matches) {
      try {
        let mappedStatus = STATUS_MAP[match.status] ?? match.status;
        if (match.status === 'IN_PLAY' && match.score?.halfTime?.home !== null && match.score?.halfTime?.home !== undefined)
          mappedStatus = '2H';
        const { home: homeScore, away: awayScore } = extractScore(match.score);
        const homeTeam = translateTeam(match.homeTeam.name);
        const awayTeam = translateTeam(match.awayTeam.name);
        const existing = await this.prisma.footballMatch.findUnique({ where: { externalId: match.id.toString() } });
        const saved = await this.prisma.footballMatch.upsert({
          where:  { externalId: match.id.toString() },
          update: { status: mappedStatus, homeScore, awayScore },
          create: { externalId: match.id.toString(), date: new Date(match.utcDate), championship: match.competition.name, homeTeam, awayTeam, status: mappedStatus, homeScore, awayScore },
        });
        if (['1H','HT','2H','ET','PEN'].includes(mappedStatus)) liveCount++;
        await this.detectAndNotify(existing, saved, homeTeam, awayTeam);
      } catch (err) { syncErrors++; this.logger.error(`Failed match ${match.id}`, err); }
    }
    await this.cacheDel(`matches:${today}`);
    if (liveCount > 0 || syncErrors > 0)
      this.logger.log(`Primary sync — ${matches.length} total, ${liveCount} live, ${syncErrors} err`);
    return { synced: matches.length, live: liveCount, errors: syncErrors, source: 'primary' };
  }

  private async updateFromScraped(scraped: ScrapedMatch[]) {
    let updated = 0, liveCount = 0;
    for (const s of scraped) {
      try {
        const day = s.startTime.toISOString().split('T')[0];
        const existing = await this.prisma.footballMatch.findFirst({
          where: { homeTeam: s.homeTeam, awayTeam: s.awayTeam, date: { gte: new Date(`${day}T00:00:00Z`), lte: new Date(`${day}T23:59:59Z`) } },
        });
        if (!existing) continue;
        const saved = await this.prisma.footballMatch.update({ where: { id: existing.id }, data: { status: s.status, homeScore: s.homeScore, awayScore: s.awayScore } });
        await this.detectAndNotify(existing, saved, s.homeTeam, s.awayTeam);
        updated++;
        if (['1H','HT','2H','ET','PEN'].includes(s.status)) liveCount++;
      } catch (err) { this.logger.error(`Scraper update failed: ${s.homeTeam} vs ${s.awayTeam}`, err); }
    }
    return { updated, live: liveCount };
  }

  private async detectAndNotify(prev: any, curr: any, homeTeam: string, awayTeam: string) {
    const users = await this.prisma.user.findMany({ where: { preferences: { receiveTelegramNotifications: true } }, include: { preferences: true } });
    if (!users.length) return;
    const messages: string[] = [];
    if (prev?.status === 'NS' && curr.status === '1H')
      messages.push(`⚽ *Jogo começou!*\n${homeTeam} x ${awayTeam}\n🏆 ${curr.championship}`);
    const prevHome = prev?.homeScore ?? null, prevAway = prev?.awayScore ?? null;
    const currHome = curr.homeScore, currAway = curr.awayScore;
    if (currHome !== null && currAway !== null && (currHome !== prevHome || currAway !== prevAway)) {
      for (let i = 0; i < currHome - (prevHome ?? 0); i++)
        messages.push(`🥅 *GOL!* ${homeTeam}\n${homeTeam} ${(prevHome??0)+i+1} x ${prevAway??0} ${awayTeam}\n🏆 ${curr.championship}`);
      for (let i = 0; i < currAway - (prevAway ?? 0); i++)
        messages.push(`🥅 *GOL!* ${awayTeam}\n${homeTeam} ${prevHome??0} x ${(prevAway??0)+i+1} ${awayTeam}\n🏆 ${curr.championship}`);
    }
    if (prev && prev.status !== 'FT' && curr.status === 'FT')
      messages.push(`🏁 *Fim de jogo!*\n${homeTeam} ${curr.homeScore??0} x ${curr.awayScore??0} ${awayTeam}\n🏆 ${curr.championship}`);
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

  async getStandings() {
    return withCache(this.redis, 'standings:wc', 300, async () => {
      const r = await fetchWithRetry(`${BASE_URL}/competitions/${COMPETITION_WC}/standings`, {}, this.headers, this.logger);
      return (r.data.standings as any[]).map(g => ({
        group: g.group ?? g.stage,
        table: g.table.map((e: any) => ({ position: e.position, teamId: e.team.id, teamName: translateTeam(e.team.name), crest: e.team.crest, points: e.points, played: e.playedGames, wins: e.won, draws: e.draw, losses: e.lost, goalsFor: e.goalsFor, goalsAgainst: e.goalsAgainst, goalDifference: e.goalDifference })),
      }));
    });
  }

  async getTopScorers() {
    return withCache(this.redis, 'scorers:wc:top10', 300, async () => {
      const r = await fetchWithRetry(`${BASE_URL}/competitions/${COMPETITION_WC}/scorers`, { limit: 10 }, this.headers, this.logger);
      return (r.data.scorers as any[]).map(e => ({ playerId: e.player.id, playerName: e.player.name, teamName: e.team?.name ? translateTeam(e.team.name) : '—', goals: e.goals ?? 0, assists: e.assists ?? 0 }));
    });
  }
}
