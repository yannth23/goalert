import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FootballApiService } from './football-api.service';
import { translateTeam } from './translation.util';

@Injectable()
export class FootballMatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly footballApiService: FootballApiService,
  ) {}

  async getTodayMatches() {
    const now = new Date();

    // Usa UTC para garantir consistência com as datas salvas no banco
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
    );
    const endOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
    );

    const matches = await this.prisma.footballMatch.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { date: 'asc' },
    });

    // Mapeia homeTeam/awayTeam → team1/team2 para o frontend
    return matches.map((m) => ({
      id: m.id,
      date: m.date,
      championship: m.championship,
      team1: translateTeam(m.homeTeam),
      team2: translateTeam(m.awayTeam),
      status: m.status,
      team1Score: m.homeScore ?? undefined,
      team2Score: m.awayScore ?? undefined,
      externalId: m.externalId ?? undefined,
    }));
  }

  async getMatchesByCompetition(competition: string) {
    const matches = await this.prisma.footballMatch.findMany({
      where: {
        championship: { contains: competition, mode: 'insensitive' },
      },
      orderBy: { date: 'asc' },
    });

    return matches.map((m) => ({
      id: m.id,
      date: m.date,
      championship: m.championship,
      team1: translateTeam(m.homeTeam),
      team2: translateTeam(m.awayTeam),
      status: m.status,
      team1Score: m.homeScore ?? undefined,
      team2Score: m.awayScore ?? undefined,
      externalId: m.externalId ?? undefined,
    }));
  }

  async getStandings() {
    return this.footballApiService.getStandings();
  }

  async getTopScorers() {
    return this.footballApiService.getTopScorers();
  }
}
