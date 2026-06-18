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
import { TelegramModule } from './telegram/telegram.module';
import { AppController } from './app.controller';

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
    TelegramModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
