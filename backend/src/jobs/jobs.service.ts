import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { FootballApiService } from '../football-match/football-api.service';
import { StatisticsPredictorService } from '../football-match/statistics-predictor.service';
import { getTodayRange } from '../shared';

@Injectable()
export class JobsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly footballApiService: FootballApiService,
    private readonly predictor: StatisticsPredictorService,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Bootstrap sync...');
    try {
      const r = await this.footballApiService.syncTodayMatches();
      this.logger.log(`Bootstrap sync done — ${r.synced} matches`);
      await this.generateTacticsForToday();
    } catch (err) {
      this.logger.error('Bootstrap sync failed', err);
    }
  }

  // Sync matinal às 7h UTC (4h BRT)
  @Cron('0 7 * * *', { name: 'sync-morning' })
  async syncMorning(): Promise<void> {
    try {
      const r = await this.footballApiService.syncTodayMatches();
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
      this.logger.log(`Midnight BRT sync done — ${r.synced} matches`);
      await this.generateTacticsForToday();
    } catch (err) {
      this.logger.error('Midnight BRT sync failed', err);
    }
  }

  // Sync a cada 2 minutos das 12h às 23h UTC (9h às 20h BRT)
  @Cron('*/2 12-23 * * *', { name: 'sync-live-matches' })
  async syncLiveMatches(): Promise<void> {
    try {
      const r = await this.footballApiService.syncTodayMatches();
      this.logger.log(`Live sync done — ${r.synced} matches`);
    } catch (err) {
      this.logger.error('Live sync failed', err);
    }
  }

  // Sync a cada 2 minutos das 00h às 03h UTC (21h às 00h BRT) — cobre jogos noturnos
  @Cron('*/2 0-3 * * *', { name: 'sync-late-night' })
  async syncLateNight(): Promise<void> {
    try {
      const r = await this.footballApiService.syncTodayMatches();
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
}
