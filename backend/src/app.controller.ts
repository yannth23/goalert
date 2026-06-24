import { Controller, Get, Post, Headers, UnauthorizedException } from '@nestjs/common';
import { FootballApiService } from './football-match/football-api.service';

@Controller()
export class AppController {
  constructor(private readonly footballApiService: FootballApiService) {}

  @Get('health')
  health() {
    return { status: 'ok', time: new Date().toISOString() };
  }

  /** Sync público sem auth — apenas para forçar atualização */
  @Post('sync-now')
  async syncNow() {
    const result = await this.footballApiService.syncTodayMatches();
    return { ...result, time: new Date().toISOString() };
  }
}
