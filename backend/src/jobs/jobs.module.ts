import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { FootballMatchModule } from '../football-match/football-match.module';
import { DailyEmailService } from './daily-email.service';
import { KeepAliveService } from './keep-alive.service';

@Module({
  imports: [PrismaModule, EmailModule, FootballMatchModule],
  providers: [DailyEmailService, KeepAliveService],
})
export class JobsModule {}
