import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
// Telegram removido
import { StatisticsPredictorService } from './statistics-predictor.service';
import { translateTeam } from './translation.util';

const BASE_URL = 'https://api.football-data.org/v4';
const COMPETITION_WC = 'WC';

const STATUS_MAP: Record<string, string> = {
  SCHEDULED:        'NS',
  TIMED:            'NS',
  IN_PLAY:          '1H',
  PAUSED:           'HT',
  EXTRA_TIME:       'ET',
  PENALTY_SHOOTOUT: 'PEN',
  FINISHED:         'FT',
  SUSPENDED:        'PST',
  POSTPONED:        'PST',
  CANCELLED:        'PST',
  AWARDED:          'FT',
};

/** Retorna a data de hoje no fuso de Brasília (America/Sao_Paulo) no formato YYYY-MM-DD */
function getTodayBrazil(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Retorna início e fim do dia de hoje no horário de Brasília como objetos Date (UTC) */
function getBrazilDayRange(): { start: Date; end: Date } {
  const dateStr = getTodayBrazil(); // ex: "2026-06-19"
  // Meia-noite em Brasília = 03:00 UTC (BRT = UTC-3)
  const start = new Date(`${dateStr}T00:00:00-03:00`);
  const end   = new Date(`${dateStr}T23:59:59-03:00`);
  return { start, end };
}

/**
 * Converte uma data UTC para o horário de Brasília (BRT = UTC-3).
 * Garante que jogos às 00:30 UTC (21:30 BRT) ficam salvos no dia correto brasileiro.
 */
function utcToBrt(utcDate: string): Date {
  const utc = new Date(utcDate);
  // BRT = UTC-3 → subtrai 3 horas
  return new Date(utc.getTime() - 3 * 60 * 60 * 1000);
}

function extractScore(score: any): { home: number | null; away: number | null } {
  // A API football-data.org coloca o placar atual em fullTime mesmo durante o jogo
  // mas se estiver em prorrogação ou pênaltis, pode estar em outros campos.
  const candidates = [
    score?.fullTime,
    score?.regularTime,
    score?.extraTime,
    score?.halfTime,
  ];
  
  // Para jogos AO VIVO, a API costuma preencher fullTime com o placar parcial.
  // Vamos procurar o primeiro campo que tenha valores numéricos.
  for (const c of candidates) {
    if (typeof c?.home === 'number' && typeof c?.away === 'number') {
      return { home: c.home, away: c.away };
    }
  }
  return { home: null, away: null };
}

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
    // Busca hoje BRT + amanhã UTC para pegar jogos que passam da meia-noite
    // Ex: jogo às 21:30 BRT = 00:30 UTC do dia seguinte
    const todayBrazil = getTodayBrazil();
    const tomorrowUtc = new Date();
    tomorrowUtc.setUTCDate(tomorrowUtc.getUTCDate() + 1);
    const tomorrowStr = tomorrowUtc.toISOString().split('T')[0];

    this.logger.log(`Syncing matches for BRT: ${todayBrazil} + UTC next day: ${tomorrowStr}`);

    // Busca os dois dias em paralelo
    const [todayResp, tomorrowResp] = await Promise.all([
      axios.get(`${BASE_URL}/matches`, { params: { date: todayBrazil }, headers: this.headers }),
      axios.get(`${BASE_URL}/matches`, { params: { date: tomorrowStr }, headers: this.headers }),
    ]);

    // Une e deduplica por id
    const seen = new Set<string>();
    const matches = [...todayResp.data.matches, ...tomorrowResp.data.matches].filter((m: any) => {
      if (seen.has(m.id.toString())) return false;
      seen.add(m.id.toString());
      return true;
    }) as any[];

    for (const match of matches) {
      // Gera predições baseadas em histórico
      const predictions = await this.statisticsPredictor.predictMatch(
        translateTeam(match.homeTeam.name), translateTeam(match.awayTeam.name));
      const mappedStatus = STATUS_MAP[match.status] ?? match.status;
      const { home: homeScore, away: awayScore } = extractScore(match.score);
      const homeTeam = translateTeam(match.homeTeam.name);
      const awayTeam = translateTeam(match.awayTeam.name);

      const existing = await this.prisma.footballMatch.findUnique({
        where: { externalId: match.id.toString() },
      });

      const saved = await this.prisma.footballMatch.upsert({
        where:  { externalId: match.id.toString() },
        update: { 
          status: mappedStatus, 
          homeScore, 
          awayScore,
          homeFlag: match.homeTeam.crest,
          awayFlag: match.awayTeam.crest,
          // ATENÇÃO: Forçando atualização para aplicar novo AI Insight textual
          predictedGoalsHome: predictions.predictedGoalsHome,
          predictedGoalsAway: predictions.predictedGoalsAway,
          predictedCards:     predictions.predictedCards,
          predictedFouls:     predictions.predictedFouls,
          homeTactics:        predictions.homeTactics as unknown as Prisma.InputJsonValue,
          awayTactics:        predictions.awayTactics as unknown as Prisma.InputJsonValue,
          aiAnalysis:         predictions.aiAnalysis,
          shortInsight:       (predictions as any).shortInsight,
        },
        create: {
          externalId:   match.id.toString(),
          date:         utcToBrt(match.utcDate),
          championship: match.competition.name,
          homeTeam,
          awayTeam,
          homeFlag:     match.homeTeam.crest,
          awayFlag:     match.awayTeam.crest,
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
    const { start, end } = getBrazilDayRange();
    
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
