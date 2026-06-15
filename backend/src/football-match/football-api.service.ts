import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const BASE_URL = 'https://api.football-data.org/v4';
const COMPETITION_WC = 'WC'; // id: 2000

// Mapeamento dos status da football-data.org → status internos do frontend
const STATUS_MAP: Record<string, string> = {
  SCHEDULED: 'NS',
  TIMED: 'NS',
  IN_PLAY: '1H',
  PAUSED: 'HT',
  EXTRA_TIME: '2H',
  PENALTY_SHOOTOUT: '2H',
  FINISHED: 'FT',
  SUSPENDED: 'PST',
  POSTPONED: 'PST',
  CANCELLED: 'PST',
  AWARDED: 'FT',
};

// Cache TTL (em segundos)
const CACHE_TTL = {
  STANDINGS: 3600, // 1 hora
  SCORERS: 3600, // 1 hora
  MATCHES: 300, // 5 minutos
};

@Injectable()
export class FootballApiService {
  private readonly logger = new Logger(FootballApiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private get headers() {
    return { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY };
  }

  async syncTodayMatches() {
    const today = new Date().toISOString().split('T')[0];

    try {
      const response = await axios.get(`${BASE_URL}/matches`, {
        params: { date: today },
        headers: this.headers,
      });

      const matches = response.data.matches as any[];

      for (const match of matches) {
        const mappedStatus = STATUS_MAP[match.status] ?? match.status;

        // score.fullTime.home/away — estrutura real da API v4
        const homeScore = match.score?.fullTime?.home ?? null;
        const awayScore = match.score?.fullTime?.away ?? null;

        await this.prisma.footballMatch.upsert({
          where: { externalId: match.id.toString() },
          update: {
            status: mappedStatus,
            homeScore,
            awayScore,
          },
          create: {
            externalId: match.id.toString(),
            date: new Date(match.utcDate),
            championship: match.competition.name,
            // Na v4 os times ficam em homeTeam.name e awayTeam.name
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            status: mappedStatus,
            homeScore,
            awayScore,
          },
        });
      }

      this.logger.log(`Synced ${matches.length} matches for ${today}`);

      // Invalidar cache após sincronização
      await this.redis.del(`matches:${today}`);

      return { synced: matches.length };
    } catch (error) {
      this.logger.error('Error syncing matches:', error);
      throw error;
    }
  }

  async getStandings() {
    const cacheKey = 'standings:wc';

    // Tentar obter do cache
    const cached = await this.redis.getJson(cacheKey);
    if (cached) {
      this.logger.debug('Standings retrieved from cache');
      return cached;
    }

    try {
      const response = await axios.get(
        `${BASE_URL}/competitions/${COMPETITION_WC}/standings`,
        { headers: this.headers },
      );

      // Copa do Mundo: standings é um array de grupos (GROUP_STAGE)
      // Cada grupo tem: stage, group (GROUP_A, GROUP_B...), table[]
      const groups = response.data.standings as any[];

      const standings = groups.map((group) => ({
        group: group.group ?? group.stage, // ex: "GROUP_A"
        table: group.table.map((entry: any) => ({
          position: entry.position,
          teamId: entry.team.id,
          teamName: entry.team.name,
          crest: entry.team.crest,
          points: entry.points,
          played: entry.playedGames,
          wins: entry.won,
          draws: entry.draw,
          losses: entry.lost,
          goalsFor: entry.goalsFor,
          goalsAgainst: entry.goalsAgainst,
          goalDifference: entry.goalDifference,
        })),
      }));

      // Armazenar no cache
      await this.redis.setJson(cacheKey, standings, CACHE_TTL.STANDINGS);

      return standings;
    } catch (error) {
      this.logger.error('Error fetching standings:', error);
      throw error;
    }
  }

  async getTopScorers() {
    const cacheKey = 'scorers:wc:top10';

    // Tentar obter do cache
    const cached = await this.redis.getJson(cacheKey);
    if (cached) {
      this.logger.debug('Top scorers retrieved from cache');
      return cached;
    }

    try {
      const response = await axios.get(
        `${BASE_URL}/competitions/${COMPETITION_WC}/scorers`,
        {
          params: { limit: 10 },
          headers: this.headers,
        },
      );

      // scorers[].player.name, scorers[].team.name, scorers[].goals
      const scorers = (response.data.scorers as any[]).map((entry) => ({
        playerId: entry.player.id,
        playerName: entry.player.name,
        teamName: entry.team?.name ?? '—',
        goals: entry.goals ?? 0,
        assists: entry.assists ?? 0,
      }));

      // Armazenar no cache
      await this.redis.setJson(cacheKey, scorers, CACHE_TTL.SCORERS);

      return scorers;
    } catch (error) {
      this.logger.error('Error fetching top scorers:', error);
      throw error;
    }
  }
}
