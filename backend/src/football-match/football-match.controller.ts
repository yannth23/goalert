import { Body, Controller, Get, Post, Query, UseGuards, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { FootballMatchService } from './football-match.service';
import { FootballApiService } from './football-api.service';
import { TeamReportService } from './team-report.service';
import { StatisticsPredictorService } from './statistics-predictor.service';
import { ScraperService } from './scraper.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BracketService } from './bracket.service';
import {
  TEAM_FLAGS,
  WORLD_CUP_GROUPS,
  QUALIFIED_THIRD_GROUPS,
  ROUND_OF_32_FIXTURE,
  ROUND_OF_16_PAIRS,
} from '../shared';

@Controller('matches')
export class FootballMatchController {
  constructor(
    private readonly footballMatchService: FootballMatchService,
    private readonly footballApiService:   FootballApiService,
    private readonly teamReportService:    TeamReportService,
    private readonly predictor:            StatisticsPredictorService,
    private readonly scraper:              ScraperService,
    private readonly bracket: BracketService,
  ) {}

  /**
   * Metadata estática de times/grupos/bracket — bandeiras, composição dos 12
   * grupos oficiais e fixture da Rd. de 32/16. O frontend consome isso em vez
   * de manter cópia própria (ver shared/team-metadata.util.ts para o porquê).
   */
  @Get('metadata')
  getMetadata() {
    return {
      flags: TEAM_FLAGS,
      groups: WORLD_CUP_GROUPS,
      qualifiedThirdGroups: QUALIFIED_THIRD_GROUPS,
      roundOf32Fixture: ROUND_OF_32_FIXTURE,
      roundOf16Pairs: ROUND_OF_16_PAIRS,
    };
  }

  /**
   * Estado ATUAL e PERSISTIDO do bracket. Isso substitui qualquer cálculo
   * feito no frontend — o frontend só renderiza o que essa resposta traz.
   */
  @Get('bracket')
  getBracket() {
    return this.bracket.getBracket();
  }

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

  /** Get all matches for a specific competition (for bracket calculation) */
  @Get('all-competition')
  getAllCompetitionMatches(@Query('name') name: string) {
    return this.footballMatchService.getAllMatchesByCompetition(name);
  }

  @Get('competition')
  getByCompetition(@Query('name') name: string, @Query('all') all?: string) { 
    if (all === 'true') {
      return this.footballMatchService.getAllMatchesByCompetition(name);
    }
    return this.footballMatchService.getMatchesByCompetition(name); 
  }

  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @Get('h2h')
  getHeadToHead(@Query('team1') team1: string, @Query('team2') team2: string) {
    return this.footballMatchService.getHeadToHead(team1, team2);
  }

  /** Admin-only: system health dashboard data. Requires JWT. */
  @Get('system-status')
  @UseGuards(JwtAuthGuard)
  getSystemStatus() { return this.footballMatchService.getSystemStatus(); }

  /** Manual sync trigger (admin). Requires JWT. */
  @SkipThrottle()
  @Post('sync')
  @UseGuards(JwtAuthGuard)
  syncMatches() { return this.footballApiService.syncTodayMatches(); }

  /** Force sync via secret header — sem JWT, para uso administrativo direto. */
  @SkipThrottle()
  @Post('force-sync')
  forceSyncMatches(@Headers('x-admin-secret') secret: string) {
    const expected = process.env.ADMIN_SYNC_SECRET ?? process.env.JWT_SECRET;
    if (!expected || secret !== expected) throw new UnauthorizedException('Invalid admin secret');
    return this.footballApiService.syncTodayMatches();
  }

  /** Reset completo do banco + resync — apaga todos os jogos e repopula */
  @SkipThrottle()
  @Post('reset-and-sync')
  async resetAndSync(@Headers('x-admin-secret') secret: string) {
    const expected = process.env.ADMIN_SYNC_SECRET ?? process.env.JWT_SECRET;
    if (!expected || secret !== expected) throw new UnauthorizedException('Invalid admin secret');
    await this.footballMatchService.deleteAllMatches();
    // Busca TODOS os jogos da Copa do Mundo 2026
    return this.footballApiService.syncAllWorldCupMatches();
  }

  /** Sincroniza TODOS os jogos da Copa do Mundo 2026 (fase de grupos completa) */
  @SkipThrottle()
  @Post('sync-all-world-cup')
  async syncAllWorldCup(@Headers('x-admin-secret') secret: string) {
    const expected = process.env.ADMIN_SYNC_SECRET ?? process.env.JWT_SECRET;
    if (!expected || secret !== expected) throw new UnauthorizedException('Invalid admin secret');
    return this.footballApiService.syncAllWorldCupMatches();
  }

  /** Força sincronização do bracket - resolve slots e avança vencedores */
  /**
   * Corrige UM slot específico do bracket que foi resolvido errado (ex: com
   * classificação parcial antes da trava de groupsComplete existir). Isso é
   * a ÚNICA forma legítima de "desfazer" o write-once — uso manual, pontual,
   * nunca automático. Depois de resetar, rode POST /bracket/sync de novo pra
   * a Rd32 ser recalculada com a classificação já completa.
   */
  @SkipThrottle()
  @Post('bracket/reset-slot')
  async resetBracketSlot(
    @Headers('x-admin-secret') secret: string,
    @Body() body: { gameNumber: number },
  ) {
    const expected = process.env.ADMIN_SYNC_SECRET ?? process.env.JWT_SECRET;
    if (!expected || secret !== expected) throw new UnauthorizedException('Invalid admin secret');
    return this.bracket.resetSlot(body.gameNumber);
  }

  /**
   * Congela o bracket com os resultados oficiais e estáticos do mata-mata
   * (KNOCKOUT_RESULTS). Sobrescreve dados errados que o sync antigo tenha
   * deixado e deixa apenas semi 102 (Inglaterra×Argentina) e a final em aberto.
   * É a forma recomendada de "deixar o bracket estático".
   */
  @SkipThrottle()
  @Post('bracket/apply-static')
  async applyStaticBracket(@Headers('x-admin-secret') secret: string) {
    const expected = process.env.ADMIN_SYNC_SECRET ?? process.env.JWT_SECRET;
    if (!expected || secret !== expected) throw new UnauthorizedException('Invalid admin secret');
    const result = await this.bracket.applyStaticResults();
    return { success: true, message: 'Bracket congelado com resultados oficiais', ...result };
  }

  @SkipThrottle()
  @Post('bracket/sync')
  async syncBracket(@Headers('x-admin-secret') secret: string) {
    const expected = process.env.ADMIN_SYNC_SECRET ?? process.env.JWT_SECRET;
    if (!expected || secret !== expected) throw new UnauthorizedException('Invalid admin secret');
    const standings = await this.footballApiService.getStandings();
    console.log('[DEBUG] Standings loaded:', standings.length, 'groups');
    if (standings.length > 0) {
      console.log('[DEBUG] First group:', JSON.stringify(standings[0], null, 2));
    }
    await this.bracket.syncFromDatabase(standings as any);
    const bracket = await this.bracket.getBracket();
    const r32Resolved = bracket.r32.filter(s => s.homeTeam && s.awayTeam).length;
    return { success: true, message: 'Bracket sincronizado', r32Resolved, totalR32: bracket.r32.length };
  }

  /** Limpa todos os caches (Redis + memCache) do sistema */
  @SkipThrottle()
  @Post('clear-cache')
  async clearCache(@Headers('x-admin-secret') secret: string) {
    const expected = process.env.ADMIN_SYNC_SECRET ?? process.env.JWT_SECRET;
    if (!expected || secret !== expected) throw new UnauthorizedException('Invalid admin secret');
    
    await Promise.all([
      this.footballMatchService.invalidateCache(),
      this.scraper.invalidateCache(),
      this.footballApiService.invalidateCache(),
    ]);
    
    return { success: true, message: 'Todos os caches foram limpos (Redis + MemCache)' };
  }

  /** Regenera táticas para todos os jogos sem análise (incluindo encerrados) */
  @SkipThrottle()
  @Post('regen-tactics')
  async regenTactics(@Headers('x-admin-secret') secret: string) {
    const expected = process.env.ADMIN_SYNC_SECRET ?? process.env.JWT_SECRET;
    if (!expected || secret !== expected) throw new UnauthorizedException('Invalid admin secret');

    const matches = await this.footballMatchService.getMatchesWithoutTactics();
    const results = { total: matches.length, success: 0, failed: 0 };

    for (const match of matches) {
      try {
        await this.predictor.updateMatchPredictions(match.id);
        results.success++;
      } catch {
        results.failed++;
      }
    }
    return results;
  }

  /** Get comprehensive team report with tactics, statistics, and web insights */
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @Get('team/:teamName/report')
  getTeamReport(@Param('teamName') teamName: string) {
    return this.teamReportService.getTeamReport(teamName);
  }
}
