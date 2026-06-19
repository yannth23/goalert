import { Module } from '@nestjs/common';
import { FootballMatchService } from './football-match.service';
import { FootballMatchController } from './football-match.controller';
import { FootballApiService } from './football-api.service';
import { ScraperService } from './scraper.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [PrismaModule, RedisModule, TelegramModule],
  controllers: [FootballMatchController],
  providers: [FootballMatchService, FootballApiService, ScraperService],
  exports: [FootballMatchService, FootballApiService],
})
export class FootballMatchModule {}
