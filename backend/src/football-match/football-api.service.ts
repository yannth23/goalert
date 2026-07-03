import { Injectable, Logger } from '@nestjs/common';
import { getTodayRange, getTodayBrazil } from '../shared/date.util';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { StatisticsPredictorService } from './statistics-predictor.service';
import { ScraperService, ScrapedMatch } from './scraper.service';
import { translateTeam } from './translation.util';
import { RedisService } from '../redis/redis.service';

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';
const WC_CODE = 'WC'; // FIFA World Cup code in football-data.org

/** Converte data UTC para BRT (UTC-3). Garante que jogos às 00:30 UTC ficam no dia correto brasileiro. */
function utcToBrt(utcDate: string): Date {
  const utc = new Date(utcDate);
  return new Date(utc.getTime() - 3 * 60 * 60 * 1000);
}

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
    private readonly statisticsPredictor: StatisticsPredictorService,
    private readonly scraper: ScraperService,
    private readonly redis: RedisService,
  ) {}

  private get footballDataHeaders() {
    return { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY };
  }

  async invalidateCache(): Promise<void> {
    await this.redis.del('standings:wc');
    await this.redis.del('scorers:wc:top10');
    await this.redis.del(`matches:${getTodayBrazil()}`);
  }

  /**
   * Sincroniza TODOS os jogos da Copa do Mundo 2026 desde o início
   * Útil para preencher o histórico da fase de grupos e calcular classificação
   */
  async syncAllWorldCupMatches() {
    this.logger.log('Syncing ALL World Cup 2026 matches...');
    
    if (!process.env.FOOTBALL_DATA_API_KEY) {
      this.logger.warn('No FOOTBALL_DATA_API_KEY configured');
      return { synced: 0, errors: 0 };
    }

    // Copa do Mundo 2026 começa em 11/06/2026 e vai até 19/07/2026
    const startDate = '2026-06-11';
    const endDate = '2026-07-19';
    
    let totalSynced = 0;
    let totalErrors = 0;

    try {
      this.logger.log(`Fetching World Cup matches from ${startDate} to ${endDate}`);
      
      // Usa o endpoint /matches em vez de /competitions/WC/matches (que requer plano premium)
      const response = await axios.get(`${FOOTBALL_DATA_BASE_URL}/matches`, {
        headers: this.footballDataHeaders,
        params: { dateFrom: startDate, dateTo: endDate },
      });

      const allMatches = response.data?.matches || [];
      this.logger.log(`Found ${allMatches.length} total matches in the period`);

      // Filtra apenas jogos da Copa do Mundo
      const matches = allMatches.filter((m: any) => 
        m.competition?.name?.toLowerCase().includes('world cup') ||
        m.competition?.code === 'WC'
      );
      
      this.logger.log(`Filtered ${matches.length} World Cup matches`);

      for (const m of matches) {
        try {
          const hScore = m.score.fullTime?.home ?? m.score.regularTime?.home ?? m.score.halfTime?.home ?? null;
          const aScore = m.score.fullTime?.away ?? m.score.regularTime?.away ?? m.score.halfTime?.away ?? null;

          const matchData = {
            externalId: m.id.toString(),
            date: new Date(m.utcDate),
            championship: 'FIFA World Cup',
            homeTeam: translateTeam(m.homeTeam.name),
            awayTeam: translateTeam(m.awayTeam.name),
            homeFlag: m.homeTeam.crest,
            awayFlag: m.awayTeam.crest,
            status: STATUS_MAP[m.status] ?? 'NS',
            homeScore: hScore,
            awayScore: aScore,
          };

          // Gera predictions só se ainda não tem
          const existing = await this.prisma.footballMatch.findUnique({
            where: { externalId: matchData.externalId },
            select: { predictedGoalsHome: true, homeTactics: true },
          });
          
          let predictions: any = {
            predictedGoalsHome: null, predictedGoalsAway: null,
            predictedCards: null, predictedFouls: null,
            homeTactics: null, awayTactics: null,
            aiAnalysis: null,
          };

          if (!existing || (existing.predictedGoalsHome === null && existing.homeTactics === null)) {
            try {
              predictions = await this.statisticsPredictor.predictMatch(matchData.homeTeam, matchData.awayTeam);
            } catch (predErr: any) {
              this.logger.warn(`Predictions failed for ${matchData.homeTeam} vs ${matchData.awayTeam}: ${predErr.message}`);
            }
          }

          await this.prisma.footballMatch.upsert({
            where: { externalId: matchData.externalId },
            update: {
              date: matchData.date,
              status: matchData.status,
              homeScore: matchData.homeScore,
              awayScore: matchData.awayScore,
              homeFlag: matchData.homeFlag,
              awayFlag: matchData.awayFlag,
              predictedGoalsHome: predictions.predictedGoalsHome,
              predictedGoalsAway: predictions.predictedGoalsAway,
              predictedCards: predictions.predictedCards,
              predictedFouls: predictions.predictedFouls,
              homeTactics: (predictions.homeTactics || Prisma.DbNull) as any,
              awayTactics: (predictions.awayTactics || Prisma.DbNull) as any,
              aiAnalysis: predictions.aiAnalysis,
            },
            create: {
              externalId: matchData.externalId,
              date: matchData.date,
              championship: matchData.championship,
              homeTeam: matchData.homeTeam,
              awayTeam: matchData.awayTeam,
              homeFlag: matchData.homeFlag,
              awayFlag: matchData.awayFlag,
              status: matchData.status,
              homeScore: matchData.homeScore,
              awayScore: matchData.awayScore,
              predictedGoalsHome: predictions.predictedGoalsHome,
              predictedGoalsAway: predictions.predictedGoalsAway,
              predictedCards: predictions.predictedCards,
              predictedFouls: predictions.predictedFouls,
              homeTactics: (predictions.homeTactics || Prisma.DbNull) as any,
              awayTactics: (predictions.awayTactics || Prisma.DbNull) as any,
              aiAnalysis: predictions.aiAnalysis,
            },
          });

          totalSynced++;
        } catch (err: any) {
          this.logger.error(`Failed to upsert match ${m.homeTeam?.name} vs ${m.awayTeam?.name}: ${err.message}`);
          totalErrors++;
        }
      }

      this.logger.log(`Synced ${totalSynced} World Cup matches with ${totalErrors} errors`);
      await this.invalidateCache();
      
      return { synced: totalSynced, errors: totalErrors };
    } catch (err: any) {
      this.logger.error(`Failed to sync World Cup matches: ${err.message}`);
      return { synced: totalSynced, errors: totalErrors + 1 };
    }
  }

  async syncTodayMatches() {
    const todayBrazil = getTodayBrazil();
    
    // Range expandido: dia atual BRT + dia anterior BRT
    // Para garantir que jogos de 00:00-03:00 BRT apareçam em ambos os dias
    const todayStart = new Date(`${todayBrazil}T00:00:00-03:00`);
    const todayEnd = new Date(`${todayBrazil}T23:59:59-03:00`);
    
    // Dia anterior BRT (para pegar jogos de 00:00-03:00 BRT que pertencem a ontem também)
    const yesterdayBrazil = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterdayBrazil.toISOString().split('T')[0];
    const yesterdayStart = new Date(`${yesterdayStr}T00:00:00-03:00`);

    this.logger.log(`Syncing matches for BRT: ${todayBrazil} (also checking ${yesterdayStr})`);

    // Range expandido: ontem 00:00 BRT até hoje 23:59 BRT + madrugada de amanhã (03:00 BRT)
    const expandedStart = yesterdayStart;
    const expandedEnd = new Date(todayEnd.getTime() + 3 * 60 * 60 * 1000);

    let matchesToProcess: any[] = [];
    let source = 'none';

    // 1. Tenta Football-Data.org (range expandido de 2 dias)
    try {
      if (process.env.FOOTBALL_DATA_API_KEY) {
        this.logger.log('Trying Football-Data.org...');
        const dateFrom = new Date(yesterdayStart.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const dateTo = new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const response = await axios.get(`${FOOTBALL_DATA_BASE_URL}/matches`, {
          headers: this.footballDataHeaders,
          params: { dateFrom, dateTo },
        });
        
        if (response.data?.matches?.length > 0) {
          // Filtramos jogos que caem no range expandido
          const filtered = response.data.matches.filter((m: any) => {
            const d = new Date(m.utcDate);
            return d >= expandedStart && d <= expandedEnd;
          });

          matchesToProcess = filtered.map((m: any) => {
            const hScore = m.score.fullTime?.home ?? m.score.regularTime?.home ?? m.score.halfTime?.home ?? null;
            const aScore = m.score.fullTime?.away ?? m.score.regularTime?.away ?? m.score.halfTime?.away ?? null;

            return {
              externalId: m.id.toString(),
              date: new Date(m.utcDate),
              championship: m.competition.name,
              homeTeam: translateTeam(m.homeTeam.name),
              awayTeam: translateTeam(m.awayTeam.name),
              homeFlag: m.homeTeam.crest,
              awayFlag: m.awayTeam.crest,
              status: STATUS_MAP[m.status] ?? 'NS',
              homeScore: hScore,
              awayScore: aScore,
            };
          });
          source = 'football-data.org';
        }
      }
    } catch (err: any) {
      this.logger.warn(`Football-Data.org failed: ${err.message}`);
    }

    // 2. Corrige horários com Google/ESPN Brasil — fonte mais confiável para BRT correto
    if (matchesToProcess.length > 0) {
      try {
        this.logger.log('[sync] Buscando horários via Google/ESPN Brasil...');
        const googleTimes = await this.scraper.fetchGoogleMatchTimes(todayBrazil);
        if (googleTimes.length > 0) {
          let corrected = 0;
          matchesToProcess = matchesToProcess.map(m => {
            const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const mHome = normalize(m.homeTeam);
            const mAway = normalize(m.awayTeam);
            const found = googleTimes.find(g => {
              const gHome = normalize(g.homeTeam);
              const gAway = normalize(g.awayTeam);
              return (mHome.includes(gHome) || gHome.includes(mHome)) &&
                     (mAway.includes(gAway) || gAway.includes(mAway));
            });
            if (found) {
              corrected++;
              this.logger.log(`[sync] Horário corrigido: ${m.homeTeam} → ${found.kickoffUtc.toISOString()}`);
              // kickoffUtc é UTC puro — salvar como UTC, frontend converte para BRT
              return { ...m, date: found.kickoffUtc };
            }
            return m;
          });
          this.logger.log(`[sync] ${corrected}/${matchesToProcess.length} horários corrigidos via Google/ESPN`);
        }
      } catch (err: any) {
        this.logger.warn(`[sync] Correção de horário falhou: ${err.message}`);
      }
    }

    // 3. Fallback para Scraper (SofaScore/ESPN) se Football-Data falhar ou não retornar nada
    if (matchesToProcess.length === 0) {
      try {
        this.logger.log('Trying Web Scrapers (SofaScore/ESPN)...');
        const scrapedMatches: ScrapedMatch[] = await this.scraper.scrapeTodayMatches();
        
        if (scrapedMatches.length > 0) {
          matchesToProcess = scrapedMatches.map((m) => ({
            externalId: `scraped_${m.homeTeam}_${m.awayTeam}_${todayBrazil}`,
            date: m.startTime,
            championship: 'FIFA World Cup', // Nome padrão para garantir exibição na seção principal
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
        // Garante sempre um lookupId válido e não-nulo
        const dateStr = match.date.toISOString().split('T')[0];
        const fallbackId = `match_${match.homeTeam}_${match.awayTeam}_${dateStr}`;
        const lookupId = !match.externalId || match.externalId.startsWith('scraped_')
          ? fallbackId
          : match.externalId;

        // Verifica se já tem predictions no banco
        const existing = await this.prisma.footballMatch.findUnique({
          where: { externalId: lookupId },
          select: { predictedGoalsHome: true, homeTactics: true },
        });
        const hasPredictions = existing?.predictedGoalsHome !== null && existing?.homeTactics !== null;

        // Gera predictions só se ainda não tem (evita bloquear o sync a cada 2min)
        let predictions: any = {
          predictedGoalsHome: null, predictedGoalsAway: null,
          predictedCards: null, predictedFouls: null,
          homeTactics: null, awayTactics: null,
          aiAnalysis: null,
        };
        if (!hasPredictions) {
          try {
            predictions = await this.statisticsPredictor.predictMatch(match.homeTeam, match.awayTeam);
          } catch (predErr: any) {
            this.logger.warn(`Predictions failed for ${match.homeTeam} vs ${match.awayTeam}: ${predErr.message}`);
          }
        }

        await this.prisma.footballMatch.upsert({
          where:  { externalId: lookupId },
          update: { 
            date: match.date,
            status: match.status, 
            homeScore: match.homeScore, 
            awayScore: match.awayScore,
            homeFlag: match.homeFlag,
            awayFlag: match.awayFlag,
            predictedGoalsHome: predictions.predictedGoalsHome,
            predictedGoalsAway: predictions.predictedGoalsAway,
            predictedCards:     predictions.predictedCards,
            predictedFouls:     predictions.predictedFouls,
            homeTactics:        (predictions.homeTactics || Prisma.DbNull) as any,
            awayTactics:        (predictions.awayTactics || Prisma.DbNull) as any,
            aiAnalysis:         predictions.aiAnalysis,
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
            homeTactics:        (predictions.homeTactics || Prisma.DbNull) as any,
            awayTactics:        (predictions.awayTactics || Prisma.DbNull) as any,
            aiAnalysis:         predictions.aiAnalysis,
          },
        });
      } catch (err: any) {
        this.logger.error(`Failed to upsert match ${match.homeTeam} vs ${match.awayTeam}: ${err.message}`);
      }
    }

    const liveCount = await this.prisma.footballMatch.count({
      where: { status: { in: ['1H', 'HT', '2H', 'ET', 'PEN'] } },
    });

    await this.redis.del(`matches:${todayBrazil}`);
    this.logger.log(`Synced ${matchesToProcess.length} matches for ${todayBrazil} from ${source}. Matches: ${JSON.stringify(matchesToProcess.map(m => `${m.homeTeam} vs ${m.awayTeam}`))}`);
    
    // Verificação final no banco para depuração
    const finalCount = await this.prisma.footballMatch.count({
      where: { date: { gte: expandedStart, lte: expandedEnd } }
    });
    this.logger.log(`DB check: ${finalCount} matches now exist in range ${expandedStart.toISOString()} - ${expandedEnd.toISOString()}`);

    return { synced: matchesToProcess.length, live: liveCount, errors: 0, source };
  }

  async getStandings() {
    const cacheKey = 'standings:wc';
    const cached   = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    // 1. Tenta ESPN — fonte mais confiável para standings em tempo real durante a Copa
    try {
      const espnStandings = await this.scraper.fetchESPNStandings();
      if (espnStandings.length > 0) {
        const mapped = espnStandings.map((group, gi) => ({
          group: group.group,
          table: group.table.map((entry, i) => ({
            position:       i + 1,
            teamId:         gi * 4 + i,
            teamName:       entry.teamName,
            crest:          null,
            points:         entry.points,
            played:         entry.played,
            wins:           entry.wins,
            draws:          entry.draws,
            losses:         entry.losses,
            goalsFor:       entry.goalsFor,
            goalsAgainst:   entry.goalsAgainst,
            goalDifference: entry.goalDifference,
          })),
        }));
        await this.redis.setJson(cacheKey, mapped, 300); // cache curto: 5 min
        this.logger.log(`Standings via ESPN: ${mapped.length} grupos`);
        return mapped;
      }
    } catch (err: any) {
      this.logger.warn(`Standings from ESPN failed: ${err.message}`);
    }

    // 2. Fallback: Football-Data.org
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

        await this.redis.setJson(cacheKey, standings, 3600);
        return standings;
      }
    } catch (err: any) {
      this.logger.warn(`Standings from Football-Data.org failed: ${err.message}`);
    }

    return [];
  }

  async getTopScorers() {
    const cacheKey = 'scorers:wc:top10';
    const cached   = await this.redis.getJson(cacheKey);
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

        await this.redis.setJson(cacheKey, scorers, 3600);
        return scorers;
      }
    } catch (err: any) {
      this.logger.warn(`Scorers from Football-Data.org failed: ${err.message}`);
    }

    return [];
  }
}

