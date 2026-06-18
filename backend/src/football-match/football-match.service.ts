import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FootballApiService } from './football-api.service';
import { getTodayRange, mapMatchToDto } from '../shared';

@Injectable()
export class FootballMatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly footballApiService: FootballApiService,
  ) {}

  async getTodayMatches() {
    const { start, end } = getTodayRange();

    const matches = await this.prisma.footballMatch.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });

    return matches.map(mapMatchToDto);
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
