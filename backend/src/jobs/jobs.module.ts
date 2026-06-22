import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FootballMatchModule } from '../football-match/football-match.module';
import { EmailModule } from '../email/email.module';
import { JobsService } from './jobs.service';
import { KeepAliveService } from './keep-alive.service';

@Module({
  imports: [PrismaModule, FootballMatchModule, EmailModule],
  providers: [JobsService, KeepAliveService],
})
export class JobsModule {}
