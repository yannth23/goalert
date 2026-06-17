import { Module } from '@nestjs/common';
import { FootballMatchService } from './football-match.service';
import { FootballMatchController } from './football-match.controller';
import { FootballApiService } from './football-api.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [PrismaModule, RedisModule, WhatsappModule],
  controllers: [FootballMatchController],
  providers: [FootballMatchService, FootballApiService],
  exports: [FootballMatchService, FootballApiService],
})
export class FootballMatchModule {}
