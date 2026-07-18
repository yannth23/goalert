import { Module } from '@nestjs/common';
import { FootballMatchService } from './football-match.service';
import { FootballMatchController } from './football-match.controller';
import { FootballApiService } from './football-api.service';
import { ScraperService } from './scraper.service';
import { StatisticsPredictorService } from './statistics-predictor.service';
import { TeamReportService } from './team-report.service';
import { BracketSeedService } from './bracket-seed.service';
import { BracketService } from './bracket.service';
import { ClubAnalysisService } from './club-analysis.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [FootballMatchController],
  providers: [
    FootballMatchService,
    FootballApiService,
    ScraperService,
    StatisticsPredictorService,
    TeamReportService,
    BracketSeedService,
    BracketService,
    ClubAnalysisService,
  ],
  exports: [
    FootballMatchService,
    FootballApiService,
    ScraperService,
    StatisticsPredictorService,
    TeamReportService,
    BracketService,
    ClubAnalysisService,
  ],
})
export class FootballMatchModule {}
