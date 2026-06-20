import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { FootballApiService } from './football-api.service';
import { ScraperService } from './scraper.service';
import { getTodayRange, mapMatchToDto } from '../shared';

const LIVE_STATUSES       = new Set(['1H', 'HT', '2H', 'ET', 'PEN']);
const MAX_MATCH_DURATION  = 3 * 60 * 60 * 1000; // 3 horas é mais que suficiente para um jogo normal + intervalo

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
  private readonly logger = new Logger(FootballMatchService.name);

  constructor(
    private readonly prisma:              PrismaService,
    private readonly redis:               RedisService,
    private readonly footballApiService:  FootballApiService,
    private readonly scraper:             ScraperService,
  ) {}

  async getTodayMatches() {
    const { start, end } = getTodayRange();
    const now = new Date();

    // Cache deletion removed to allow normal cache behavior and avoid hitting API limits unnecessarily
    // The sync job handles cache invalidation when new data is fetched.

    const matches = await this.prisma.footballMatch.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });
    const sanitised = matches.map(m => {
      const matchTime = new Date(m.date).getTime();
      const elapsedMs = now.getTime() - matchTime;
      
      // Lógica de segurança para evitar status "preso":
      // 1. Se o jogo está em status LIVE mas já se passaram mais de 3 horas do início -> Força FT
      // 2. Se o jogo está NS mas já se passaram mais de 3 horas e meia do início planejado -> Força FT
      if ((LIVE_STATUSES.has(m.status) && elapsedMs > MAX_MATCH_DURATION) || 
          (m.status === 'NS' && elapsedMs > MAX_MATCH_DURATION + (30 * 60 * 1000))) {
        return { ...m, status: 'FT' };
      }
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
    // 1. Tenta via scraping (Sofascore) — histórico real
    try {
      const scraped = await this.scraper.scrapeH2H(team1, team2);
      if (scraped && scraped.totalMatches > 0) {
        this.logger.log(`[h2h] dados do Sofascore: ${team1} vs ${team2} — ${scraped.totalMatches} jogos`);
        return {
          homeTeam: team1,
          awayTeam: team2,
          homeWins:       scraped.homeWins,
          draws:          scraped.draws,
          awayWins:       scraped.awayWins,
          totalGoalsHome: scraped.totalGoalsHome,
          totalGoalsAway: scraped.totalGoalsAway,
          totalMatches:   scraped.totalMatches,
          recentMatches:  scraped.recentMatches,
        };
      }
    } catch (err: any) {
      this.logger.warn(`[h2h] scraping falhou, usando banco: ${err.message}`);
    }

    // 2. Fallback: banco de dados local
    this.logger.log(`[h2h] usando banco de dados para ${team1} vs ${team2}`);
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

    let homeWins = 0, draws = 0, awayWins = 0;
    let totalGoalsHome = 0, totalGoalsAway = 0;

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

    return {
      homeTeam: team1,
      awayTeam: team2,
      homeWins, draws, awayWins,
      totalGoalsHome, totalGoalsAway,
      totalMatches: matches.length,
      recentMatches: matches.slice(0, 5).map(m => ({
        date: m.date.toISOString().split('T')[0],
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore ?? 0,
        awayScore: m.awayScore ?? 0,
        championship: m.championship,
      })),
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
