import { Injectable, Logger } from '@nestjs/common';
import { getTodayRange, getTodayBrazil } from '../shared/date.util';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { StatisticsPredictorService } from './statistics-predictor.service';
import { ScraperService, ScrapedMatch } from './scraper.service';
import { translateTeam } from './translation.util';

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';
const WC_CODE = 'WC'; // FIFA World Cup code in football-data.org

const STATUS_MAP: Record<string, string> = {
  // Football-Data.org Statuses
  'SCHEDULED': 'NS',
  'TIMED': 'NS',
  'IN_PLAY': '1H',
  'PAUSED': 'HT',
  'EXTRA_TIME': 'ET',
  'PENALTY_SHOOTOUT': 'PEN',
  'FINISHED': 'FT',
  'POSTPONED': 'PST',
  'CANCELLED': 'PST',
  'SUSPENDED': 'PST',
  
  // API-Football v3 Statuses (fallback)
  'TBD': 'NS',  'NS': 'NS',
  '1H':  '1H',  'HT': 'HT',  '2H': '2H',
  'ET':  'ET',  'BT': 'ET',  'P':  'PEN',
  'FT':  'FT',  'AET':'FT',  'PEN':'FT',
  'SUSP':'PST', 'PST':'PST', 'CANC':'PST', 'ABD':'PST',
  'AWD': 'FT',  'WO': 'FT',
  'LIVE':'1H',
};

@Injectable()
export class FootballApiService {
  private readonly logger = new Logger(FootballApiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly statisticsPredictor: StatisticsPredictorService,
    private readonly scraper: ScraperService,
  ) {}

  private get footballDataHeaders() {
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

    let matchesToProcess: any[] = [];
    let source = 'none';

    // 1. Tenta Football-Data.org
    try {
      if (process.env.FOOTBALL_DATA_API_KEY) {
        this.logger.log('Trying Football-Data.org...');
        const response = await axios.get(`${FOOTBALL_DATA_BASE_URL}/matches`, {
          headers: this.footballDataHeaders,
          params: { dateFrom: todayBrazil, dateTo: todayBrazil },
        });
        
        if (response.data?.matches?.length > 0) {
          matchesToProcess = response.data.matches.map((m: any) => ({
            externalId: m.id.toString(),
            date: new Date(m.utcDate),
            championship: m.competition.name,
            homeTeam: translateTeam(m.homeTeam.name),
            awayTeam: translateTeam(m.awayTeam.name),
            homeFlag: m.homeTeam.crest,
            awayFlag: m.awayTeam.crest,
            status: STATUS_MAP[m.status] ?? 'NS',
            homeScore: m.score.fullTime.home,
            awayScore: m.score.fullTime.away,
          }));
          source = 'football-data.org';
        }
      }
    } catch (err: any) {
      this.logger.warn(`Football-Data.org failed: ${err.message}`);
    }

    // 2. Fallback para Scraper (SofaScore/ESPN) se Football-Data falhar ou não retornar nada
    if (matchesToProcess.length === 0) {
      try {
        this.logger.log('Trying Web Scrapers (SofaScore/ESPN)...');
        const scrapedMatches: ScrapedMatch[] = await this.scraper.scrapeTodayMatches();
        
        if (scrapedMatches.length > 0) {
          matchesToProcess = scrapedMatches.map((m) => ({
            externalId: `scraped_${m.homeTeam}_${m.awayTeam}_${todayBrazil}`,
            date: m.startTime,
            championship: 'Copa do Mundo', // Scraper foca em Copa do Mundo
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            homeFlag: null, // Scraper pode não ter logo
            awayFlag: null,
            status: m.status,
            homeScore: m.homeScore,
            awayScore: m.awayScore,
          }));
          source = 'web-scraper';
        }
      } catch (err: any) {
        this.logger.error(`Scraper failed: ${err.message}`);
      }
    }

    for (const match of matchesToProcess) {
      try {
        // Gera predições baseadas em histórico
        const predictions = await this.statisticsPredictor.predictMatch(match.homeTeam, match.awayTeam);
        
        // Se não houver externalId, usamos um identificador composto para evitar nulos no @unique
        const lookupId = match.externalId || `scraped_${match.homeTeam}_${match.awayTeam}_${match.date.toISOString().split('T')[0]}`;

        await this.prisma.footballMatch.upsert({
          where:  { externalId: lookupId },
          update: { 
            status: match.status, 
            homeScore: match.homeScore, 
            awayScore: match.awayScore,
            homeFlag: match.homeFlag,
            awayFlag: match.awayFlag,
            predictedGoalsHome: predictions.predictedGoalsHome,
            predictedGoalsAway: predictions.predictedGoalsAway,
            predictedCards:     predictions.predictedCards,
            predictedFouls:     predictions.predictedFouls,
            homeTactics:        predictions.homeTactics as any,
            awayTactics:        predictions.awayTactics as any,
            aiAnalysis:         predictions.aiAnalysis,
            shortInsight:       predictions.shortInsight,
            attentionPoint:     predictions.attentionPoint,
          },
          create: {
            externalId:   lookupId,
            date:         match.date,
            championship: match.championship,
            homeTeam:     match.homeTeam,
            awayTeam:     match.awayTeam,
            homeFlag:     match.homeFlag,
            awayFlag:     match.awayFlag,
            status:       match.status,
            homeScore:    match.homeScore,
            awayScore:    match.awayScore,
            predictedGoalsHome: predictions.predictedGoalsHome,
            predictedGoalsAway: predictions.predictedGoalsAway,
            predictedCards:     predictions.predictedCards,
            predictedFouls:     predictions.predictedFouls,
            homeTactics:        predictions.homeTactics as any,
            awayTactics:        predictions.awayTactics as any,
            aiAnalysis:         predictions.aiAnalysis,
            shortInsight:       predictions.shortInsight,
            attentionPoint:     predictions.attentionPoint,
          },
        });
      } catch (err: any) {
        this.logger.error(`Failed to upsert match ${match.homeTeam} vs ${match.awayTeam}: ${err.message}`);
      }
    }

    const liveCount = await this.prisma.footballMatch.count({
      where: { status: { in: ['1H', 'HT', '2H', 'ET', 'PEN'] } },
    });

    await this.cacheDel(`matches:${todayBrazil}`);
    this.logger.log(`Synced ${matchesToProcess.length} matches for ${todayBrazil} from ${source}`);
    return { synced: matchesToProcess.length, live: liveCount, errors: 0, source };
  }

  async getStandings() {
    const cacheKey = 'standings:wc';
    const cached   = await this.cacheGet(cacheKey);
    if (cached) return cached;

    // Tenta Football-Data.org para classificação
    try {
      if (process.env.FOOTBALL_DATA_API_KEY) {
        const response = await axios.get(`${FOOTBALL_DATA_BASE_URL}/competitions/${WC_CODE}/standings`, {
          headers: this.footballDataHeaders,
        });

        const standings = response.data.standings.map((group: any) => ({
          group: group.group,
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

        await this.cacheSet(cacheKey, standings, 3600);
        return standings;
      }
    } catch (err: any) {
      this.logger.warn(`Standings from Football-Data.org failed: ${err.message}`);
    }

    return [];
  }

  async getTopScorers() {
    const cacheKey = 'scorers:wc:top10';
    const cached   = await this.cacheGet(cacheKey);
    if (cached) return cached;

    // Tenta Football-Data.org para artilheiros
    try {
      if (process.env.FOOTBALL_DATA_API_KEY) {
        const response = await axios.get(`${FOOTBALL_DATA_BASE_URL}/competitions/${WC_CODE}/scorers`, {
          headers: this.footballDataHeaders,
        });

        const scorers = response.data.scorers.map((entry: any) => ({
          playerId:   entry.player.id,
          playerName: entry.player.name,
          teamName:   translateTeam(entry.team.name),
          goals:      entry.goals ?? 0,
          assists:    entry.assists ?? 0,
        }));

        await this.cacheSet(cacheKey, scorers, 3600);
        return scorers;
      }
    } catch (err: any) {
      this.logger.warn(`Scorers from Football-Data.org failed: ${err.message}`);
    }

    return [];
  }
}
