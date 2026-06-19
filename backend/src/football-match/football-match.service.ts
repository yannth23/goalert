import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { FootballApiService } from './football-api.service';
import { getTodayRange, mapMatchToDto } from '../shared';

const LIVE_STATUSES       = new Set(['1H', 'HT', '2H', 'ET', 'PEN']);
const MAX_MATCH_DURATION  = 3.5 * 60 * 60 * 1000;

export interface H2HResult {
  homeTeam: string;
  awayTeam: string;
  homeWins: number;
  draws: number;
  awayWins: number;
  totalGoalsHome: number;
  totalGoalsAway: number;
  totalMatches: number;
  recentMatches: {
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    championship: string;
  }[];
}

@Injectable()
export class FootballMatchService {
  constructor(
    private readonly prisma:              PrismaService,
    private readonly redis:               RedisService,
    private readonly footballApiService:  FootballApiService,
  ) {}

  async getTodayMatches() {
    const { start, end } = getTodayRange();
    const now = new Date();

    const todayBrazil = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    await this.redis.del(`matches:${todayBrazil}`).catch(() => {});

    const matches = await this.prisma.footballMatch.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });
    const sanitised = matches.map(m => {
      if (LIVE_STATUSES.has(m.status) && now.getTime() - new Date(m.date).getTime() > MAX_MATCH_DURATION)
        return { ...m, status: 'FT' };
      return m;
    });
    return sanitised.map(mapMatchToDto);
  }

  async getMatchesByCompetition(competition: string) {
    const matches = await this.prisma.footballMatch.findMany({
      where: { championship: { contains: competition, mode: 'insensitive' } },
      orderBy: { date: 'asc' },
    });
    return matches.map(mapMatchToDto);
  }

  async getCalendarData(month?: string): Promise<{ date: string; count: number }[]> {
    const now = new Date();
    let year = now.getFullYear(), mon = now.getMonth();
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      year = parseInt(month.slice(0, 4));
      mon  = parseInt(month.slice(5, 7)) - 1;
    }
    const start = new Date(year, mon, 1);
    const end   = new Date(year, mon + 1, 1);
    const matches = await this.prisma.footballMatch.findMany({
      where: { date: { gte: start, lt: end } },
      select: { date: true },
    });
    const counts: Record<string, number> = {};
    for (const m of matches) {
      const d = new Date(m.date);
      const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return Object.entries(counts).map(([date, count]) => ({ date, count })).sort((a,b) => a.date.localeCompare(b.date));
  }

  async getHeadToHead(team1: string, team2: string): Promise<H2HResult> {
    const matches = await this.prisma.footballMatch.findMany({
      where: {
        status: 'FT',
        OR: [
          { homeTeam: { contains: team1, mode: 'insensitive' }, awayTeam: { contains: team2, mode: 'insensitive' } },
          { homeTeam: { contains: team2, mode: 'insensitive' }, awayTeam: { contains: team1, mode: 'insensitive' } },
        ],
      },
      orderBy: { date: 'desc' },
      take: 20,
    });

    let homeWins = 0;
    let draws = 0;
    let awayWins = 0;
    let totalGoalsHome = 0;
    let totalGoalsAway = 0;

    for (const m of matches) {
      const hScore = m.homeScore ?? 0;
      const aScore = m.awayScore ?? 0;
      const isTeam1Home = m.homeTeam.toLowerCase().includes(team1.toLowerCase());

      totalGoalsHome += isTeam1Home ? hScore : aScore;
      totalGoalsAway += isTeam1Home ? aScore : hScore;

      if (hScore > aScore) {
        if (isTeam1Home) homeWins++; else awayWins++;
      } else if (hScore < aScore) {
        if (isTeam1Home) awayWins++; else homeWins++;
      } else {
        draws++;
      }
    }

    const recentMatches = matches.slice(0, 5).map(m => ({
      date: m.date.toISOString().split('T')[0],
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeScore: m.homeScore ?? 0,
      awayScore: m.awayScore ?? 0,
      championship: m.championship,
    }));

    return {
      homeTeam: team1,
      awayTeam: team2,
      homeWins,
      draws,
      awayWins,
      totalGoalsHome,
      totalGoalsAway,
      totalMatches: matches.length,
      recentMatches,
    };
  }

  async getSystemStatus() {
    const today = new Date().toISOString().split('T')[0];
    const { start, end } = getTodayRange();

    const [lastSync, errorsStr, failuresStr, totalToday, liveNow] = await Promise.all([
      this.redis.getJson<any>('sync:last_result').catch(() => null),
      this.redis.get(`sync:errors:${today}`).catch(() => null),
      this.redis.get('sync:consecutive_failures').catch(() => null),
      this.prisma.footballMatch.count({ where: { date: { gte: start, lte: end } } }),
      this.prisma.footballMatch.count({ where: { date: { gte: start, lte: end }, status: { in: ['1H','HT','2H','ET','PEN'] } } }),
    ]);

    return {
      lastSync:            lastSync ?? null,
      redis:               { connected: this.redis.isConnectedToRedis() },
      matches:             { total: totalToday, live: liveNow },
      errorsToday:         parseInt(errorsStr ?? '0', 10),
      consecutiveFailures: parseInt(failuresStr ?? '0', 10),
      serverTime:          new Date().toISOString(),
    };
  }

  async getStandings() { return this.footballApiService.getStandings(); }
  async getTopScorers() { return this.footballApiService.getTopScorers(); }
}
