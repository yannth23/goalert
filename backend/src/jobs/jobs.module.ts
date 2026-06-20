import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FootballMatchModule } from '../football-match/football-match.module';
import { JobsService } from './jobs.service';
import { KeepAliveService } from './keep-alive.service';

@Module({
  imports: [PrismaModule, FootballMatchModule],
  providers: [JobsService, KeepAliveService],
})
export class JobsModule {}
