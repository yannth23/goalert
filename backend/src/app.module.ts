import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { JobsModule } from './jobs/jobs.module';
import { FootballMatchModule } from './football-match/football-match.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    UserModule,
    JobsModule,
    FootballMatchModule,
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
