import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { FootballApiService } from '../football-match/football-api.service';
import { FootballMatchService } from '../football-match/football-match.service';
import { StatisticsPredictorService } from '../football-match/statistics-predictor.service';
import { getTodayRange } from '../shared';

@Injectable()
export class JobsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly footballApiService: FootballApiService,
    private readonly predictor: StatisticsPredictorService,
    private readonly footballMatchService: FootballMatchService,
  ) {}

  async onApplicationBootstrap() {
    // Roda async sem bloquear o bootstrap — evita timeout do Render
    setTimeout(() => this.runBootstrapTasks(), 5000);
  }

  private async runBootstrapTasks() {
    this.logger.log('Bootstrap sync...');
    try {
      const r = await this.footballApiService.syncTodayMatches();
      this.footballMatchService.invalidateCache('today-matches');
      this.logger.log(`Bootstrap sync done — ${r.synced} matches`);
      // Gera táticas em background sem bloquear
      this.generateTacticsForAll().catch(err =>
        this.logger.error('Background tactics generation failed', err)
      );
    } catch (err) {
      this.logger.error('Bootstrap sync failed', err);
    }
  }

  // Sync matinal às 7h UTC (4h BRT)
  @Cron('0 7 * * *', { name: 'sync-morning' })
  async syncMorning(): Promise<void> {
    try {
      const r = await this.footballApiService.syncTodayMatches();
      this.footballMatchService.invalidateCache('today-matches');
      this.logger.log(`Morning sync done — ${r.synced} matches`);
      await this.generateTacticsForToday();
    } catch (err) {
      this.logger.error('Morning sync failed', err);
    }
  }

  // Sync na virada do dia BRT — 03:00 UTC = 00:00 BRT
  // Garante que jogos de madrugada aparecem nos dois dias
  @Cron('0 3 * * *', { name: 'sync-midnight-brt' })
  async syncMidnightBrt(): Promise<void> {
    this.logger.log('Midnight BRT sync — ensuring late-night games appear on new day...');
    try {
      const r = await this.footballApiService.syncTodayMatches();
      this.footballMatchService.invalidateCache('today-matches');
      this.logger.log(`Midnight BRT sync done — ${r.synced} matches`);
      await this.generateTacticsForToday();
    } catch (err) {
      this.logger.error('Midnight BRT sync failed', err);
    }
  }

  // Gera táticas a cada hora pra pegar jogos novos sem análise
  @Cron('0 * * * *', { name: 'gen-tactics-hourly' })
  async genTacticsHourly(): Promise<void> {
    await this.generateTacticsForToday();
  }

  // Sync a cada 2 minutos das 9h às 23h UTC (6h às 20h BRT) — cobre todos os jogos do dia
  @Cron('*/2 9-23 * * *', { name: 'sync-live-matches' })
  async syncLiveMatches(): Promise<void> {
    try {
      const r = await this.footballApiService.syncTodayMatches();
      this.footballMatchService.invalidateCache('today-matches');
      this.logger.log(`Live sync done — ${r.synced} matches`);
    } catch (err) {
      this.logger.error('Live sync failed', err);
    }
  }

  // Sync a cada 2 minutos das 00h às 04h UTC (21h às 01h BRT) — cobre jogos noturnos e virada
  @Cron('*/2 0-4 * * *', { name: 'sync-late-night' })
  async syncLateNight(): Promise<void> {
    try {
      const r = await this.footballApiService.syncTodayMatches();
      this.footballMatchService.invalidateCache('today-matches');
      this.logger.log(`Late night sync done — ${r.synced} matches`);
    } catch (err) {
      this.logger.error('Late night sync failed', err);
    }
  }

  private async generateTacticsForToday(): Promise<void> {
    try {
      const { start, end } = getTodayRange();
      const matches = await this.prisma.footballMatch.findMany({
        where: {
          date: { gte: start, lte: end },
          homeTactics: { equals: null },
        },
        select: { id: true, homeTeam: true, awayTeam: true },
      });

      if (!matches.length) return;

      this.logger.log(`Generating tactics for ${matches.length} matches...`);
      for (const match of matches) {
        try {
          await this.predictor.updateMatchPredictions(match.id);
          this.logger.log(`Tactics OK: ${match.homeTeam} x ${match.awayTeam}`);
        } catch (err: any) {
          this.logger.error(`Tactics failed: ${match.homeTeam} x ${match.awayTeam}: ${err.message}`);
        }
      }
    } catch (err: any) {
      this.logger.error('generateTacticsForToday failed', err.message);
    }
  }

  /** Gera táticas para TODOS os jogos sem análise (sem filtro de data) */
  private async generateTacticsForAll(): Promise<void> {
    try {
      const matches = await this.prisma.footballMatch.findMany({
        where: { homeTactics: { equals: null } },
        select: { id: true, homeTeam: true, awayTeam: true },
        orderBy: { date: 'desc' },
      });

      if (!matches.length) {
        this.logger.log('All matches already have tactics');
        return;
      }

      this.logger.log(`Generating tactics for ALL ${matches.length} matches without analysis...`);
      for (const match of matches) {
        try {
          await this.predictor.updateMatchPredictions(match.id);
          this.logger.log(`Tactics OK: ${match.homeTeam} x ${match.awayTeam}`);
        } catch (err: any) {
          this.logger.error(`Tactics failed: ${match.homeTeam} x ${match.awayTeam}: ${err.message}`);
        }
      }
      this.logger.log('All tactics generation complete');
    } catch (err: any) {
      this.logger.error('generateTacticsForAll failed', err.message);
    }
  }
}
