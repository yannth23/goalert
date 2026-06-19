import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FootballApiService } from './football-api.service';
import { getTodayRange, mapMatchToDto } from '../shared';

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'PEN']);

// A match cannot realistically last more than 3.5 hours (90min + ET + penalties + stoppages).
// If a match has a live/halftime status but started >3.5h ago, it's stuck — display as FT.
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

    // Sanitise stale live statuses: if sync missed the final whistle,
    // the match would stay forever as "1H"/"2H" in the DB.
    // We fix the display here without touching the DB.
    const sanitised = matches.map((m) => {
      if (LIVE_STATUSES.has(m.status)) {
        const elapsed = now.getTime() - new Date(m.date).getTime();
        if (elapsed > MAX_MATCH_DURATION_MS) {
          return { ...m, status: 'FT' };
        }
      }
      return m;
    });

    return sanitised.map(mapMatchToDto);
  }

  async getMatchesByCompetition(competition: string) {
    const matches = await this.prisma.footballMatch.findMany({
      where: {
        championship: { contains: competition, mode: 'insensitive' },
      },
      orderBy: { date: 'asc' },
    });

    return matches.map(mapMatchToDto);
  }

  async getStandings() {
    return this.footballApiService.getStandings();
  }

  async getTopScorers() {
    return this.footballApiService.getTopScorers();
  }
}
