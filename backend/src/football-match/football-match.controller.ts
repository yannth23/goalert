import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { FootballMatchService } from './football-match.service';
import { FootballApiService } from './football-api.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('matches')
export class FootballMatchController {
  constructor(
    private readonly footballMatchService: FootballMatchService,
    private readonly footballApiService: FootballApiService,
  ) {}

  @Get()
  getTodayMatches() {
    return this.footballMatchService.getTodayMatches();
  }

  @Get('competition')
  getByCompetition(@Query('name') name: string) {
    return this.footballMatchService.getMatchesByCompetition(name);
  }

  @Get('standings')
  getStandings() {
    return this.footballMatchService.getStandings();
  }

  @Get('scorers')
  getTopScorers() {
    return this.footballMatchService.getTopScorers();
  }

  // Endpoint manual para forçar sync (protegido por JWT)
  @Post('sync')
  @UseGuards(JwtAuthGuard)
  syncMatches() {
    return this.footballApiService.syncTodayMatches();
  }
}
