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
import { RedisModule } from './redis/redis.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 60 },
      { name: 'strict',  ttl: 60_000, limit: 10 },
    ]),
    PrismaModule,
    RedisModule,
    UserModule,
    JobsModule,
    FootballMatchModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
