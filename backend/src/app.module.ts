import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { JobsModule } from './jobs/jobs.module';
import { FootballMatchModule } from './football-match/football-match.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { FootballApiService } from './football-match/football-api.service';
import { ScraperService } from './football-match/scraper.service';
import { StatisticsPredictorService } from './football-match/statistics-predictor.service';
import { TeamReportService } from './football-match/team-report.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 60 },
      { name: 'strict',  ttl: 60_000, limit: 10 },
    ]),
    PrismaModule,
    UserModule,
    JobsModule,
    FootballMatchModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    FootballApiService, ScraperService, StatisticsPredictorService, TeamReportService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
