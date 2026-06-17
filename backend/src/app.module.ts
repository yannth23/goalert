import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { EmailModule } from './email/email.module';
import { JobsModule } from './jobs/jobs.module';
import { FootballMatchModule } from './football-match/football-match.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';
import { EmailService } from './email/email.service';
import { FootballApiService } from './football-match/football-api.service';
import { DailyEmailService } from './jobs/daily-email.service';
import { WhatsappService } from './whatsapp/whatsapp.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    UserModule,
    EmailModule,
    JobsModule,
    FootballMatchModule,
    AuthModule,
    WhatsappModule,
  ],
  controllers: [AppController],
  providers: [PrismaService, EmailService, FootballApiService, DailyEmailService, WhatsappService],
})
export class AppModule {}
