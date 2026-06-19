import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FootballApiService } from './football-api.service';
import { getTodayRange, mapMatchToDto } from '../shared';

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'PEN']);
const MAX_MATCH_DURATION_MS = 3.5 * 60 * 60 * 1000;

@Injectable()
export class FootballMatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly footballApiService: FootballApiService,
  ) {}

  async getTodayMatches() {
    const { start, end } = getTodayRange();
    const now = new Date();

    const matches = await this.prisma.footballMatch.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });

    const sanitised = matches.map((m) => {
      if (LIVE_STATUSES.has(m.status)) {
        const elapsed = now.getTime() - new Date(m.date).getTime();
        if (elapsed > MAX_MATCH_DURATION_MS) return { ...m, status: 'FT' };
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

  /** Returns match counts grouped by day for a given month (YYYY-MM). */
  async getCalendarData(month?: string): Promise<{ date: string; count: number }[]> {
    const now = new Date();
    let year  = now.getFullYear();
    let mon   = now.getMonth();

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
      const d   = new Date(m.date);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }

    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getStandings() {
    return this.footballApiService.getStandings();
  }

  async getTopScorers() {
    return this.footballApiService.getTopScorers();
  }
}
