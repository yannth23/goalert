import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { translateTeam } from './translation.util';

const BASE_URL = 'https://api.football-data.org/v4';
const COMPETITION_WC = 'WC';

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

const CACHE_TTL = {
  STANDINGS: 300,
  SCORERS: 300,
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

  // Cache helpers que nunca lançam erro
  private async cacheGet<T>(key: string): Promise<T | null> {
    try {
      return await this.redis.getJson<T>(key);
    } catch {
      return null;
    }
  }

  private async cacheSet<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      await this.redis.setJson(key, value, ttl);
    } catch {
      // ignora falha de cache
    }
  }

  private async cacheDel(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch {
      // ignora falha de cache
    }
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
      const homeScore = match.score?.fullTime?.home ?? null;
      const awayScore = match.score?.fullTime?.away ?? null;

      await this.prisma.footballMatch.upsert({
        where: { externalId: match.id.toString() },
        update: { status: mappedStatus, homeScore, awayScore },
        create: {
          externalId: match.id.toString(),
          date: new Date(match.utcDate),
          championship: match.competition.name,
          homeTeam: translateTeam(match.homeTeam.name),
          awayTeam: translateTeam(match.awayTeam.name),
          status: mappedStatus,
          homeScore,
          awayScore,
        },
      });
    }

    await this.cacheDel(`matches:${today}`);
    this.logger.log(`Synced ${matches.length} matches for ${today}`);
    return { synced: matches.length };
  }

  async getStandings() {
    const cacheKey = 'standings:wc';
    const cached = await this.cacheGet(cacheKey);
    if (cached) return cached;

    const response = await axios.get(
      `${BASE_URL}/competitions/${COMPETITION_WC}/standings`,
      { headers: this.headers },
    );

    const groups = response.data.standings as any[];
    const standings = groups.map((group) => ({
      group: group.group ?? group.stage,
      table: group.table.map((entry: any) => ({
        position: entry.position,
        teamId: entry.team.id,
        teamName: translateTeam(entry.team.name),
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

    await this.cacheSet(cacheKey, standings, CACHE_TTL.STANDINGS);
    return standings;
  }

  async getTopScorers() {
    const cacheKey = 'scorers:wc:top10';
    const cached = await this.cacheGet(cacheKey);
    if (cached) return cached;

    const response = await axios.get(
      `${BASE_URL}/competitions/${COMPETITION_WC}/scorers`,
      { params: { limit: 10 }, headers: this.headers },
    );

    const scorers = (response.data.scorers as any[]).map((entry) => ({
      playerId: entry.player.id,
      playerName: entry.player.name,
      teamName: entry.team?.name ? translateTeam(entry.team.name) : '—',
      goals: entry.goals ?? 0,
      assists: entry.assists ?? 0,
    }));

    await this.cacheSet(cacheKey, scorers, CACHE_TTL.SCORERS);
    return scorers;
  }
}
