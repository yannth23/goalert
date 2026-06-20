import { Injectable, Logger } from '@nestjs/common';
import { getTodayRange, getTodayBrazil } from '../shared/date.util';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
// Telegram removido
import { StatisticsPredictorService } from './statistics-predictor.service';
import { translateTeam } from './translation.util';

const BASE_URL = 'https://api.football-data.org/v4';
const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io'; // Nova URL para API-Football
const COMPETITION_WC = 1; // FIFA World Cup ID in API-Football v3
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;

const STATUS_MAP: Record<string, string> = {
  // API-Football v3 Statuses
  'TBD': 'NS',  'NS': 'NS',
  '1H':  '1H',  'HT': 'HT',  '2H': '2H',
  'ET':  'ET',  'BT': 'ET',  'P':  'PEN',
  'FT':  'FT',  'AET':'FT',  'PEN':'FT',
  'SUSP':'PST', 'PST':'PST', 'CANC':'PST', 'ABD':'PST',
  'AWD': 'FT',  'WO': 'FT',
  'LIVE':'1H',

  // Legacy mappings (just in case)
  SCHEDULED:        'NS',
  TIMED:            'NS',
  IN_PLAY:          '1H',
  PAUSED:           'HT',
  EXTRA_TIME:       'ET',
  PENALTY_SHOOTOUT: 'PEN',
  FINISHED:         'FT',
};





@Injectable()
export class FootballApiService {
  private readonly logger = new Logger(FootballApiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly statisticsPredictor: StatisticsPredictorService,
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
    const { start, end } = getTodayRange();
    const todayBrazil = getTodayBrazil();

    this.logger.log(`Syncing matches for BRT: ${todayBrazil} (range: ${start.toISOString()} - ${end.toISOString()})`);

    const response = await axios.get(`${API_FOOTBALL_BASE_URL}/fixtures`, {
      headers: { 'x-apisports-key': API_FOOTBALL_KEY },
      params: {
        date: todayBrazil, // A API-Football v3 usa a data no formato YYYY-MM-DD
        timezone: 'America/Sao_Paulo',
      },
    });

    const matches = response.data.response.filter((match: any) => {
      const matchDate = new Date(match.fixture.date);
      return matchDate >= start && matchDate <= end;
    });

    for (const match of matches) {
      // Gera predições baseadas em histórico
      const predictions = await this.statisticsPredictor.predictMatch(
        translateTeam(match.teams.home.name), translateTeam(match.teams.away.name));
      const mappedStatus = STATUS_MAP[match.fixture.status.short] ?? match.fixture.status.short;
      const homeScore = match.goals.home;
      const awayScore = match.goals.away;
      const homeTeam = translateTeam(match.teams.home.name);
      const awayTeam = translateTeam(match.teams.away.name);

      const existing = await this.prisma.footballMatch.findUnique({
        where: { externalId: match.fixture.id.toString() },
      });

      const saved = await this.prisma.footballMatch.upsert({
        where:  { externalId: match.fixture.id.toString() },
        update: { 
          status: mappedStatus, 
          homeScore, 
          awayScore,
          homeFlag: match.teams.home.logo,
          awayFlag: match.teams.away.logo,
          predictedGoalsHome: predictions.predictedGoalsHome,
          predictedGoalsAway: predictions.predictedGoalsAway,
          predictedCards:     predictions.predictedCards,
          predictedFouls:     predictions.predictedFouls,
          homeTactics:        predictions.homeTactics as unknown as Prisma.InputJsonValue,
          awayTactics:        predictions.awayTactics as unknown as Prisma.InputJsonValue,
          aiAnalysis:         predictions.aiAnalysis,
          shortInsight:       (predictions as any).shortInsight,
          attentionPoint:     (predictions as any).attentionPoint,
        },
        create: {
          externalId:   match.fixture.id.toString(),
          date:         new Date(match.fixture.date),
          championship: match.league.name,
          homeTeam,
          awayTeam,
          homeFlag:     match.teams.home.logo,
          awayFlag:     match.teams.away.logo,
          status:       mappedStatus,
          homeScore,
          awayScore,
          predictedGoalsHome: predictions.predictedGoalsHome,
          predictedGoalsAway: predictions.predictedGoalsAway,
          predictedCards:     predictions.predictedCards,
          predictedFouls:     predictions.predictedFouls,
          homeTactics:        predictions.homeTactics as unknown as Prisma.InputJsonValue,
          awayTactics:        predictions.awayTactics as unknown as Prisma.InputJsonValue,
          aiAnalysis:         predictions.aiAnalysis,
          shortInsight:       (predictions as any).shortInsight,
          attentionPoint:     (predictions as any).attentionPoint,
        },
      });

      await this.detectAndNotify(existing, saved, homeTeam, awayTeam);
    }

    const liveCount = await this.prisma.footballMatch.count({
      where: { status: { in: ['1H', 'HT', '2H', 'ET', 'PEN'] } },
    });

    // Força a limpeza do cache deletando a chave específica e qualquer variação
    await this.cacheDel(`matches:${todayBrazil}`);
    await this.cacheDel(`matches:${todayBrazil}:v2`); // Chave de segurança para forçar refresh
    this.logger.log(`Synced ${matches.length} matches for ${todayBrazil}`);
    return { synced: matches.length, live: liveCount, errors: 0, source: 'football-data.org' };
  }

  private async detectAndNotify(prev: any, curr: any, homeTeam: string, awayTeam: string) {
    // Notificações removidas (Telegram)
  }

  async getTodayMatchesFromDb() {
    // Busca jogos do dia de hoje no horário do Brasil
      const { start, end } = getTodayRange();
    
    // Forçamos a limpeza do cache de hoje para garantir que dados novos (posse de bola corrigida) apareçam
    const todayBrazil = getTodayBrazil();
    await this.cacheDel(`matches:${todayBrazil}`);

    return this.prisma.footballMatch.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });
  }

  async getStandings() {
    const cacheKey = 'standings:wc';
    const cached   = await this.cacheGet(cacheKey);
    if (cached) return cached;

    const response = await axios.get(`${API_FOOTBALL_BASE_URL}/standings`, {
      headers: { 'x-apisports-key': API_FOOTBALL_KEY },
      params: { league: COMPETITION_WC }, // Assumindo que COMPETITION_WC é o ID da liga na API-Football v3
    });

    const standingsData = response.data.response?.[0]?.league?.standings || [];
    const standings = standingsData.map((group: any) => ({
      group: Array.isArray(group) ? (group[0]?.group ?? 'Group') : (group.group ?? group.stage),
      table: (Array.isArray(group) ? group : group.table).map((entry: any) => ({
        position:       entry.rank,
        teamId:         entry.team.id,
        teamName:       translateTeam(entry.team.name),
        crest:          entry.team.logo,
        points:         entry.points,
        played:         entry.all.played,
        wins:           entry.all.win,
        draws:          entry.all.draw,
        losses:         entry.all.lose,
        goalsFor:       entry.all.goals.for,
        goalsAgainst:   entry.all.goals.against,
        goalDifference: entry.goalsDiff,
      })),
    }));

    await this.cacheSet(cacheKey, standings, 300);
    return standings;
  }

  async getTopScorers() {
    const cacheKey = 'scorers:wc:top10';
    const cached   = await this.cacheGet(cacheKey);
    if (cached) return cached;

    const response = await axios.get(`${API_FOOTBALL_BASE_URL}/topscorers`, {
      headers: { 'x-apisports-key': API_FOOTBALL_KEY },
      params: { league: COMPETITION_WC, season: new Date().getFullYear() }, // Assumindo que COMPETITION_WC é o ID da liga na API-Football v3
    });

    const scorers = (response.data.response as any[] || []).map((entry) => ({
      playerId:   entry.player.id,
      playerName: entry.player.name,
      teamName:   entry.statistics?.[0]?.team?.name ? translateTeam(entry.statistics[0].team.name) : '—',
      goals:      entry.statistics?.[0]?.goals?.total ?? 0,
      assists:    entry.statistics?.[0]?.goals?.assists ?? 0,
    }));

    await this.cacheSet(cacheKey, scorers, 300);
    return scorers;
  }
}
