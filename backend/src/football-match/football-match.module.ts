import { Module } from '@nestjs/common';
import { FootballMatchService } from './football-match.service';
import { FootballMatchController } from './football-match.controller';
import { FootballApiService } from './football-api.service';
import { ScraperService } from './scraper.service';
import { StatisticsPredictorService } from './statistics-predictor.service';
import { TeamReportService } from './team-report.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [FootballMatchController],
  providers: [FootballMatchService, FootballApiService, ScraperService, StatisticsPredictorService, TeamReportService],
  exports: [FootballMatchService, FootballApiService, StatisticsPredictorService, TeamReportService],
})
export class FootballMatchModule {}
