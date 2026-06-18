import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TelegramService } from '../telegram/telegram.service';
import { translateTeam } from './translation.util';

const BASE_URL = 'https://api.football-data.org/v4';
const COMPETITION_WC = 'WC';

const STATUS_MAP: Record<string, string> = {
  SCHEDULED:        'NS',
  TIMED:            'NS',
  IN_PLAY:          '1H',
  PAUSED:           'HT',
  EXTRA_TIME:       '2H',
  PENALTY_SHOOTOUT: '2H',
  FINISHED:         'FT',
  SUSPENDED:        'PST',
  POSTPONED:        'PST',
  CANCELLED:        'PST',
  AWARDED:          'FT',
};

function extractScore(score: any): { home: number | null; away: number | null } {
  const home =
    score?.regularTime?.home ??
    score?.halfTime?.home ??
    score?.fullTime?.home ??
    null;
  const away =
    score?.regularTime?.away ??
    score?.halfTime?.away ??
    score?.fullTime?.away ??
    null;
  return { home, away };
}

@Injectable()
export class FootballApiService {
  private readonly logger = new Logger(FootballApiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly telegram: TelegramService,
  ) {}

  private get headers() {
    return { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY };
  }

  private async cacheGet<T>(key: string): Promise<T | null> {
    try { return await this.redis.getJson<T>(key); } catch { return null; }
  }

  private async cacheSet<T>(key: string, value: T, ttl: number): Promise<void> {
    try { await this.redis.setJson(key, value, ttl); } catch {}
  }

  private async cacheDel(key: string): Promise<void> {
    try { await this.redis.del(key); } catch {}
  }

  async syncTodayMatches() {
    const today = new Date().toISOString().split('T')[0];

    const response = await axios.get(`${BASE_URL}/matches`, {
      params: { date: today },
      headers: this.headers,
    });

    const matches = response.data.matches as any[];

    for (const match of matches) {
      const mappedStatus = STATUS_MAP[match.status] ?? match.status;
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

      await this.detectAndNotify(existing, saved, homeTeam, awayTeam);
    }

    await this.cacheDel(`matches:${today}`);
    this.logger.log(`Synced ${matches.length} matches for ${today}`);
    return { synced: matches.length };
  }

  private async detectAndNotify(prev: any, curr: any, homeTeam: string, awayTeam: string) {
    // Busca todos os usuários com Telegram ativo — sem filtro de time favorito
    const users = await this.prisma.user.findMany({
      where: {
        preferences: { receiveTelegramNotifications: true },
      },
      include: { preferences: true },
    });

    if (!users.length) return;

    const messages: string[] = [];

    // Jogo começou
    if (prev?.status === 'NS' && curr.status === '1H') {
      messages.push(
        `⚽ *Jogo começou!*
${homeTeam} x ${awayTeam}
🏆 ${curr.championship}`,
      );
    }

    // Gol — placar mudou
    const prevHome = prev?.homeScore ?? null;
    const prevAway = prev?.awayScore ?? null;
    const currHome = curr.homeScore;
    const currAway = curr.awayScore;

    const placarDisponivel = currHome !== null && currAway !== null;
    const placarMudou = placarDisponivel && (currHome !== prevHome || currAway !== prevAway);

    if (placarMudou) {
      const golsHome = currHome - (prevHome ?? 0);
      const golsAway = currAway - (prevAway ?? 0);

      for (let i = 0; i < golsHome; i++) {
        const parcialHome = (prevHome ?? 0) + i + 1;
        const parcialAway = prevAway ?? 0;
        messages.push(
          `🥅 *GOL!* ${homeTeam}
${homeTeam} ${parcialHome} x ${parcialAway} ${awayTeam}
🏆 ${curr.championship}`,
        );
      }
      for (let i = 0; i < golsAway; i++) {
        const parcialHome = prevHome ?? 0;
        const parcialAway = (prevAway ?? 0) + i + 1;
        messages.push(
          `🥅 *GOL!* ${awayTeam}
${homeTeam} ${parcialHome} x ${parcialAway} ${awayTeam}
🏆 ${curr.championship}`,
        );
      }
    }

    // Fim de jogo
    if (prev && prev.status !== 'FT' && curr.status === 'FT') {
      messages.push(
        `🏁 *Fim de jogo!*
${homeTeam} ${curr.homeScore ?? 0} x ${curr.awayScore ?? 0} ${awayTeam}
🏆 ${curr.championship}`,
      );
    }

    if (!messages.length) return;

    for (const user of users) {
      const chatId = user.preferences?.telegramChatId;
      if (!chatId) continue;
      for (const msg of messages) {
        await this.telegram.sendMessage(chatId, msg);
      }
    }
  }

  async getStandings() {
    const cacheKey = 'standings:wc';
    const cached   = await this.cacheGet(cacheKey);
    if (cached) return cached;

    const response = await axios.get(
      `${BASE_URL}/competitions/${COMPETITION_WC}/standings`,
      { headers: this.headers },
    );

    const standings = (response.data.standings as any[]).map((group) => ({
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

    await this.cacheSet(cacheKey, standings, 300);
    return standings;
  }

  async getTopScorers() {
    const cacheKey = 'scorers:wc:top10';
    const cached   = await this.cacheGet(cacheKey);
    if (cached) return cached;

    const response = await axios.get(
      `${BASE_URL}/competitions/${COMPETITION_WC}/scorers`,
      { params: { limit: 10 }, headers: this.headers },
    );

    const scorers = (response.data.scorers as any[]).map((entry) => ({
      playerId:   entry.player.id,
      playerName: entry.player.name,
      teamName:   entry.team?.name ? translateTeam(entry.team.name) : '—',
      goals:      entry.goals ?? 0,
      assists:    entry.assists ?? 0,
    }));

    await this.cacheSet(cacheKey, scorers, 300);
    return scorers;
  }
}
