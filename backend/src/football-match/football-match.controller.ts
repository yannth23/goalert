import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { FootballMatchService } from './football-match.service';
import { FootballApiService } from './football-api.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('matches')
export class FootballMatchController {
  constructor(
    private readonly footballMatchService: FootballMatchService,
    private readonly footballApiService:   FootballApiService,
  ) {}

  @Get()
  getTodayMatches() { return this.footballMatchService.getTodayMatches(); }

  @Get('calendar')
  getCalendar(@Query('month') month?: string) { return this.footballMatchService.getCalendarData(month); }

  @Get('standings')
  getStandings() { return this.footballMatchService.getStandings(); }

  @Get('scorers')
  getTopScorers() { return this.footballMatchService.getTopScorers(); }

  @Get('competition')
  getByCompetition(@Query('name') name: string) { return this.footballMatchService.getMatchesByCompetition(name); }

  /** Admin-only: system health dashboard data. Requires JWT. */
  @Get('system-status')
  @UseGuards(JwtAuthGuard)
  getSystemStatus() { return this.footballMatchService.getSystemStatus(); }

  /** Manual sync trigger (admin). Requires JWT. */
  @Post('sync')
  @UseGuards(JwtAuthGuard)
  syncMatches() { return this.footballApiService.syncTodayMatches(); }
}
