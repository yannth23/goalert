import { Controller, Get, Post, Query, UseGuards, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { FootballMatchService } from './football-match.service';
import { FootballApiService } from './football-api.service';
import { TeamReportService } from './team-report.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('matches')
export class FootballMatchController {
  constructor(
    private readonly footballMatchService: FootballMatchService,
    private readonly footballApiService:   FootballApiService,
    private readonly teamReportService:    TeamReportService,
  ) {}

  @Get()
  async getTodayMatches() { 
    const matches = await this.footballMatchService.getTodayMatches();
    console.log(`[FootballMatchController] Returning ${matches.length} matches to frontend`);
    return matches;
  }

  @Get('calendar')
  getCalendar(@Query('month') month?: string) { return this.footballMatchService.getCalendarData(month); }

  @Get('standings')
  getStandings() { return this.footballMatchService.getStandings(); }

  @Get('scorers')
  getTopScorers() { return this.footballMatchService.getTopScorers(); }

  @Get('competition')
  getByCompetition(@Query('name') name: string) { return this.footballMatchService.getMatchesByCompetition(name); }

  @Get('h2h')
  getHeadToHead(@Query('team1') team1: string, @Query('team2') team2: string) {
    return this.footballMatchService.getHeadToHead(team1, team2);
  }

  @Get('team-report')
  getTeamReport(@Query('name') name: string) {
    return this.footballMatchService.getTeamReport(name);
  }

  /** Admin-only: system health dashboard data. Requires JWT. */
  @Get('system-status')
  @UseGuards(JwtAuthGuard)
  getSystemStatus() { return this.footballMatchService.getSystemStatus(); }

  /** Manual sync trigger (admin). Requires JWT. */
  @Post('sync')
  @UseGuards(JwtAuthGuard)
  syncMatches() { return this.footballApiService.syncTodayMatches(); }

  /** Force sync via secret header — sem JWT, para uso administrativo direto. */
  @Post('force-sync')
  forceSyncMatches(@Headers('x-admin-secret') secret: string) {
    const expected = process.env.ADMIN_SYNC_SECRET ?? process.env.JWT_SECRET;
    if (!expected || secret !== expected) throw new UnauthorizedException('Invalid admin secret');
    return this.footballApiService.syncTodayMatches();
  }

  /** Get comprehensive team report with tactics, statistics, and web insights */
  @Get('team/:teamName/report')
  getTeamReport(@Param('teamName') teamName: string) {
    return this.teamReportService.getTeamReport(teamName);
  }
}
