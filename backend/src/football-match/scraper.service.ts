import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { RedisService } from '../redis/redis.service';
import { translateTeam } from './translation.util';

const SCRAPER_TIMEOUT_MS = 7_000;
const CACHE_TTL_SECONDS  = 90;

export interface ScrapedH2HMatch {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  championship: string;
}

export interface ScrapedH2H {
  homeWins: number;
  draws: number;
  awayWins: number;
  totalGoalsHome: number;
  totalGoalsAway: number;
  totalMatches: number;
  recentMatches: ScrapedH2HMatch[];
}

// SofaScore sometimes uses different names — map the most common divergences
const SCRAPER_ALIASES: Record<string, string> = {
  'USA':              'Estados Unidos',
  'Korea Republic':   'Coreia do Sul',
  'Republic of Korea':'Coreia do Sul',
  'IR Iran':          'Irã',
  'Türkiye':          'Turquia',
  'Ivory Coast':      'Costa do Marfim',
  "Côte d'Ivoire":   'Costa do Marfim',
  'Czech Republic':   'República Tcheca',
  'North Macedonia':  'Macedônia do Norte',
  'Bosnia':           'Bósnia e Herzegovina',
  'DR Congo':         'RD Congo',
};

function normalizeName(raw: string): string {
  return SCRAPER_ALIASES[raw] ?? translateTeam(raw);
}

export interface ScrapedMatch {
  homeTeam:  string;         // Portuguese name (normalised)
  awayTeam:  string;
  homeScore: number | null;
  awayScore: number | null;
  status:    string;         // NS / 1H / HT / 2H / ET / PEN / FT / PST
  startTime: Date;
  source:    'sofascore' | 'espn';
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(private readonly redis: RedisService) {}

  /** Public entry-point: returns today's matches from the best available scraper.
   *  Tenta em paralelo SofaScore + ESPN (múltiplas ligas) e mescla os resultados.
   *  Fontes: SofaScore → ESPN World Cup → ESPN All Soccer → TheSportsDB
   */
  async scrapeTodayMatches(): Promise<ScrapedMatch[]> {
    const today    = new Date().toISOString().split('T')[0];
    const cacheKey = `scraper:today:${today}`;

    try {
      const cached = await this.redis.getJson<ScrapedMatch[]>(cacheKey);
      if (cached && cached.length > 0) {
        this.logger.log(`[scraper] cache hit — ${cached.length} matches`);
        return cached;
      }
    } catch { /* cache miss */ }

    // Tenta SofaScore primeiro (melhor cobertura)
    try {
      const matches = await this.fetchSofaScore(today);
      if (matches.length > 0) {
        await this.redis.setJson(cacheKey, matches, CACHE_TTL_SECONDS).catch(() => {});
        this.logger.log(`[scraper] SofaScore — ${matches.length} matches`);
        return matches;
      }
    } catch (err: any) {
      this.logger.warn(`[scraper] SofaScore failed: ${err.message}`);
    }

    // Tenta ESPN em múltiplas ligas em paralelo
    try {
      const matches = await this.fetchESPNMultiLeague(today);
      if (matches.length > 0) {
        await this.redis.setJson(cacheKey, matches, CACHE_TTL_SECONDS).catch(() => {});
        this.logger.log(`[scraper] ESPN multi-league — ${matches.length} matches`);
        return matches;
      }
    } catch (err: any) {
      this.logger.warn(`[scraper] ESPN multi-league failed: ${err.message}`);
    }

    // Tenta TheSportsDB como última opção
    try {
      const matches = await this.fetchTheSportsDB(today);
      if (matches.length > 0) {
        await this.redis.setJson(cacheKey, matches, CACHE_TTL_SECONDS).catch(() => {});
        this.logger.log(`[scraper] TheSportsDB — ${matches.length} matches`);
        return matches;
      }
    } catch (err: any) {
      this.logger.warn(`[scraper] TheSportsDB failed: ${err.message}`);
    }

    this.logger.warn('[scraper] all sources exhausted — 0 matches');
    return [];
  }

  // ── SofaScore ─────────────────────────────────────────────────────────────
  private async fetchSofaScore(date: string): Promise<ScrapedMatch[]> {
    const res = await axios.get(
      `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${date}`,
      {
        timeout: SCRAPER_TIMEOUT_MS,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          'Referer': 'https://www.sofascore.com/',
          'Accept':  'application/json',
        },
      },
    );

    const events: any[] = res.data?.events ?? [];

    return events
      .filter(e => this.isCopaMundial(e))
      .map(e => ({
        homeTeam:  normalizeName(e.homeTeam?.name ?? ''),
        awayTeam:  normalizeName(e.awayTeam?.name ?? ''),
        homeScore: e.homeScore?.current ?? null,
        awayScore: e.awayScore?.current ?? null,
        status:    this.mapSofaStatus(e.status),
        startTime: new Date((e.startTimestamp ?? 0) * 1000),
        source:    'sofascore' as const,
      }))
      .filter(m => m.homeTeam && m.awayTeam);
  }

  private isCopaMundial(event: any): boolean {
    const name = (
      event.tournament?.name ??
      event.tournament?.uniqueTournament?.name ??
      ''
    ).toLowerCase();
    // Match FIFA World Cup but avoid Copa América, Libertadores, etc.
    return name.includes('world cup') || name.includes('mundial');
  }

  private mapSofaStatus(status: any): string {
    const type = status?.type ?? '';
    const desc = (status?.description ?? '').toLowerCase();
    switch (type) {
      case 'notstarted': return 'NS';
      case 'halftime':   return 'HT';
      case 'finished':   return 'FT';
      case 'overtime':   return 'ET';
      case 'penalties':  return 'PEN';
      case 'postponed':
      case 'canceled':   return 'PST';
      case 'inprogress':
        // SofaScore: "2nd half", "2nd extra time", etc.
        return desc.includes('2nd') ? '2H' : '1H';
      default:           return 'NS';
    }
  }

  // ── ESPN public API (single league — mantido para compatibilidade) ────────
  private async fetchESPN(): Promise<ScrapedMatch[]> {
    return this.fetchESPNLeague('fifa.world');
  }

  // ── ESPN multi-league (Copa do Mundo 2026 + qualificatórias) ──────────────
  private async fetchESPNMultiLeague(_date: string): Promise<ScrapedMatch[]> {
    const leagues = [
      'fifa.world',
      'fifa.worldq.conmebol',
      'fifa.worldq.concacaf',
      'fifa.worldq.uefa',
      'fifa.worldq.afc',
      'fifa.worldq.caf',
    ];

    const results = await Promise.allSettled(
      leagues.map(l => this.fetchESPNLeague(l)),
    );

    // Mescla e deduplica por par de times
    const seen = new Set<string>();
    const merged: ScrapedMatch[] = [];

    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      for (const m of r.value) {
        const key = [m.homeTeam, m.awayTeam].sort().join('_');
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(m);
        }
      }
    }

    return merged;
  }

  private async fetchESPNLeague(league: string): Promise<ScrapedMatch[]> {
    const res = await axios.get(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard`,
      {
        timeout: SCRAPER_TIMEOUT_MS,
        headers: { 'Accept': 'application/json' },
      },
    );

    const events: any[] = res.data?.events ?? [];

    return events.flatMap((event: any) => {
      const comp = event.competitions?.[0];
      if (!comp) return [];

      const home = comp.competitors?.find((c: any) => c.homeAway === 'home');
      const away = comp.competitors?.find((c: any) => c.homeAway === 'away');
      if (!home || !away) return [];

      return [{
        homeTeam:  normalizeName(home.team?.displayName ?? ''),
        awayTeam:  normalizeName(away.team?.displayName ?? ''),
        homeScore: home.score != null ? parseInt(home.score, 10) : null,
        awayScore: away.score != null ? parseInt(away.score, 10) : null,
        status:    this.mapESPNStatus(comp.status?.type?.name ?? ''),
        startTime: new Date(event.date ?? Date.now()),
        source:    'espn' as const,
      }] as ScrapedMatch[];
    }).filter((m: ScrapedMatch) => m.homeTeam && m.awayTeam);
  }

  // ── TheSportsDB (fallback gratuito) ────────────────────────────────────────
  private async fetchTheSportsDB(date: string): Promise<ScrapedMatch[]> {
    // API pública TheSportsDB — eventos por data
    const res = await axios.get(
      `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${date}&s=Soccer`,
      {
        timeout: SCRAPER_TIMEOUT_MS,
        headers: { 'Accept': 'application/json' },
      },
    );

    const events: any[] = res.data?.events ?? [];

    return events
      .filter((e: any) => {
        const league = (e.strLeague ?? '').toLowerCase();
        return league.includes('world cup') || league.includes('mundial') ||
               league.includes('copa do mundo');
      })
      .map((e: any) => ({
        homeTeam:  normalizeName(e.strHomeTeam ?? ''),
        awayTeam:  normalizeName(e.strAwayTeam ?? ''),
        homeScore: e.intHomeScore != null ? Number(e.intHomeScore) : null,
        awayScore: e.intAwayScore != null ? Number(e.intAwayScore) : null,
        status:    this.mapTheSportsDBStatus(e.strStatus ?? '', e.intHomeScore, e.intAwayScore),
        startTime: new Date(`${e.dateEvent}T${e.strTime ?? '00:00:00'}Z`),
        source:    'espn' as const,
      }))
      .filter((m: ScrapedMatch) => m.homeTeam && m.awayTeam);
  }

  private mapTheSportsDBStatus(status: string, homeScore: any, awayScore: any): string {
    const s = status.toLowerCase();
    if (s === 'match finished' || s === 'ft') return 'FT';
    if (s === 'not started' || s === '') return 'NS';
    if (s.includes('postponed') || s.includes('cancelled')) return 'PST';
    if (homeScore !== null && awayScore !== null) return '1H';
    return 'NS';
  }

  private mapESPNStatus(name: string): string {
    switch (name) {
      case 'STATUS_SCHEDULED':   return 'NS';
      case 'STATUS_IN_PROGRESS': return '1H';
      case 'STATUS_HALFTIME':    return 'HT';
      case 'STATUS_FINAL':       return 'FT';
      case 'STATUS_EXTRA_TIME':  return 'ET';
      case 'STATUS_PENALTIES':   return 'PEN';
      case 'STATUS_POSTPONED':   return 'PST';
      default:                   return 'NS';
    }
  }

  // ── Lineup scraping ────────────────────────────────────────────────────────

  /**
   * Busca a escalação mais recente do time em múltiplas fontes:
   * SofaScore → ESPN → TheSportsDB → GE/globo (scraping HTML).
   * Retorna lista com os 11 titulares ou [] se todas falharem.
   */
  async scrapeLineup(teamName: string): Promise<string[]> {
    const cacheKey = `lineup:${teamName.toLowerCase().replace(/\s+/g, '-')}`;
    try {
      const cached = await this.redis.getJson<string[]>(cacheKey);
      if (cached && cached.length >= 11) {
        this.logger.log(`[scraper] lineup cache hit: ${teamName}`);
        return cached;
      }
    } catch {}

    // Tenta cada fonte em sequência até obter >= 11 jogadores
    const sources: Array<() => Promise<string[]>> = [
      () => this.lineupFromSofaScore(teamName),
      () => this.lineupFromESPN(teamName),
      () => this.lineupFromTheSportsDB(teamName),
    ];

    for (const source of sources) {
      try {
        const players = await source();
        if (players.length >= 11) {
          await this.redis.setJson(cacheKey, players, 6 * 60 * 60).catch(() => {});
          this.logger.log(`[scraper] escalação obtida para ${teamName}: ${players.slice(0, 3).join(', ')}...`);
          return players;
        }
      } catch (err: any) {
        this.logger.warn(`[scraper] source falhou para ${teamName}: ${err.message}`);
      }
    }

    this.logger.warn(`[scraper] todas as fontes falharam para escalação de ${teamName}`);
    return [];
  }

  private async lineupFromSofaScore(teamName: string): Promise<string[]> {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://www.sofascore.com/',
      'Accept': 'application/json',
    };

    // Busca ID do time
    const searchRes = await axios.get(
      `https://api.sofascore.com/api/v1/search/all?q=${encodeURIComponent(teamName)}&page=0`,
      { headers, timeout: SCRAPER_TIMEOUT_MS },
    );
    const teamResult = (searchRes.data?.results ?? []).find((r: any) => r.type === 'team');
    if (!teamResult) throw new Error(`time não encontrado no SofaScore: ${teamName}`);
    const teamId: number = teamResult.entity.id;

    // Busca eventos (últimas páginas para encontrar Copa do Mundo)
    const pages = await Promise.all([0, 1].map(p =>
      axios.get(
        `https://api.sofascore.com/api/v1/team/${teamId}/events/last/${p}`,
        { headers, timeout: SCRAPER_TIMEOUT_MS },
      ).then(r => r.data?.events ?? []).catch(() => []),
    ));
    const events: any[] = pages.flat();
    if (!events.length) throw new Error('nenhum evento encontrado');

    // Prefere Copa do Mundo 2026, depois Copa do Mundo genérica, depois o mais recente
    const sortByPriority = (e: any): number => {
      const n = (e.tournament?.name ?? e.tournament?.uniqueTournament?.name ?? '').toLowerCase();
      if (n.includes('world cup 2026') || n.includes('mundial 2026')) return 3;
      if (n.includes('world cup') || n.includes('mundial')) return 2;
      return 1;
    };
    const sorted = [...events].sort((a, b) => sortByPriority(b) - sortByPriority(a));
    const targetEvent = sorted[0];
    if (!targetEvent) throw new Error('nenhum evento disponível');

    const eventId: number = targetEvent.id;
    const lineupRes = await axios.get(
      `https://api.sofascore.com/api/v1/event/${eventId}/lineups`,
      { headers, timeout: SCRAPER_TIMEOUT_MS },
    );

    const homeId: number = targetEvent.homeTeam?.id;
    const side = homeId === teamId ? lineupRes.data?.home : lineupRes.data?.away;
    if (!side?.players) throw new Error('escalação não disponível');

    return (side.players as any[])
      .filter((p: any) => !p.substitute)
      .map((p: any) => p.player?.name ?? p.player?.shortName ?? '')
      .filter(Boolean)
      .slice(0, 11);
  }

  private async lineupFromESPN(teamName: string): Promise<string[]> {
    // ESPN soccer scoreboard for FIFA World Cup 2026
    const leagues = [
      'fifa.world',
      'fifa.world.qualifier.concacaf',
      'fifa.world.qualifier.conmebol',
      'fifa.world.qualifier.uefa',
    ];

    for (const league of leagues) {
      try {
        const res = await axios.get(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard`,
          { timeout: SCRAPER_TIMEOUT_MS, headers: { Accept: 'application/json' } },
        );

        const events: any[] = res.data?.events ?? [];
        const normalizedSearch = teamName.toLowerCase();

        for (const event of events) {
          const comp = event.competitions?.[0];
          if (!comp) continue;

          const competitor = (comp.competitors ?? []).find((c: any) =>
            (c.team?.displayName ?? '').toLowerCase().includes(normalizedSearch) ||
            normalizedSearch.includes((c.team?.displayName ?? '').toLowerCase()),
          );
          if (!competitor) continue;

          const eventId: string = event.id;
          const teamId: string = competitor.team?.id;
          if (!eventId || !teamId) continue;

          const rosterRes = await axios.get(
            `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/summary?event=${eventId}`,
            { timeout: SCRAPER_TIMEOUT_MS, headers: { Accept: 'application/json' } },
          );

          const rosters: any[] = rosterRes.data?.rosters ?? [];
          const teamRoster = rosters.find((r: any) => r.team?.id === teamId || r.team?.displayName?.toLowerCase().includes(normalizedSearch));
          if (!teamRoster?.roster) continue;

          const starters: string[] = (teamRoster.roster as any[])
            .filter((p: any) => p.starter === true)
            .map((p: any) => p.athlete?.displayName ?? p.athlete?.shortName ?? '')
            .filter(Boolean)
            .slice(0, 11);

          if (starters.length >= 11) return starters;

          // Se não trouxe starters, pega os primeiros 11
          const allPlayers: string[] = (teamRoster.roster as any[])
            .map((p: any) => p.athlete?.displayName ?? p.athlete?.shortName ?? '')
            .filter(Boolean)
            .slice(0, 11);

          if (allPlayers.length >= 11) return allPlayers;
        }
      } catch { /* tenta próxima liga */ }
    }

    throw new Error(`ESPN: nenhuma escalação encontrada para ${teamName}`);
  }

  private async lineupFromTheSportsDB(teamName: string): Promise<string[]> {
    // TheSportsDB é gratuito e tem escalações recentes
    const searchRes = await axios.get(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`,
      { timeout: SCRAPER_TIMEOUT_MS, headers: { Accept: 'application/json' } },
    );

    const teams: any[] = searchRes.data?.teams ?? [];
    const team = teams.find((t: any) =>
      (t.strSport ?? '').toLowerCase() === 'soccer' ||
      (t.strSport ?? '').toLowerCase() === 'football',
    );
    if (!team) throw new Error(`TheSportsDB: time não encontrado: ${teamName}`);

    const teamId: string = team.idTeam;

    // Busca últimos 5 eventos
    const eventsRes = await axios.get(
      `https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${teamId}`,
      { timeout: SCRAPER_TIMEOUT_MS, headers: { Accept: 'application/json' } },
    );
    const events: any[] = eventsRes.data?.results ?? [];

    // Prefere eventos da Copa do Mundo
    const sortedEvents = [...events].sort((a, b) => {
      const aIsWC = (a.strLeague ?? '').toLowerCase().includes('world cup') ? 1 : 0;
      const bIsWC = (b.strLeague ?? '').toLowerCase().includes('world cup') ? 1 : 0;
      return bIsWC - aIsWC;
    });

    for (const event of sortedEvents.slice(0, 3)) {
      try {
        const lineupRes = await axios.get(
          `https://www.thesportsdb.com/api/v1/json/3/lookuplineup.php?idEvent=${event.idEvent}`,
          { timeout: SCRAPER_TIMEOUT_MS, headers: { Accept: 'application/json' } },
        );
        const lineup: any[] = lineupRes.data?.lineup ?? [];
        if (!lineup.length) continue;

        const normalizedSearch = teamName.toLowerCase();
        const teamLineup = lineup.filter((p: any) => {
          const pTeam = (p.strTeam ?? '').toLowerCase();
          return pTeam.includes(normalizedSearch) || normalizedSearch.includes(pTeam);
        });

        const starters = teamLineup
          .filter((p: any) => p.strPosition && !p.strPosition.toLowerCase().includes('sub'))
          .map((p: any) => p.strPlayer ?? '')
          .filter(Boolean)
          .slice(0, 11);

        if (starters.length >= 11) return starters;
      } catch { /* tenta próximo evento */ }
    }

    throw new Error(`TheSportsDB: escalação não encontrada para ${teamName}`);
  }

  // ── H2H scraping ───────────────────────────────────────────────────────────

  /**
   * Busca o histórico de confrontos diretos entre dois times via Sofascore.
   * Retorna null se falhar — o chamador deve cair no banco de dados.
   */
  async scrapeH2H(team1Name: string, team2Name: string): Promise<ScrapedH2H | null> {
    const cacheKey = `h2h:${[team1Name, team2Name].map(t => t.toLowerCase().replace(/\s+/g, '-')).sort().join('_vs_')}`;
    try {
      const cached = await this.redis.getJson<ScrapedH2H>(cacheKey);
      if (cached) {
        this.logger.log(`[scraper] h2h cache hit: ${team1Name} vs ${team2Name}`);
        return cached;
      }
    } catch {}

    const sofascoreHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Referer': 'https://www.sofascore.com/',
      'Accept': 'application/json',
    };

    try {
      // 1. Busca IDs dos dois times em paralelo
      const [res1, res2] = await Promise.all([
        axios.get(`https://api.sofascore.com/api/v1/search/all?q=${encodeURIComponent(team1Name)}&page=0`,
          { headers: sofascoreHeaders, timeout: SCRAPER_TIMEOUT_MS }),
        axios.get(`https://api.sofascore.com/api/v1/search/all?q=${encodeURIComponent(team2Name)}&page=0`,
          { headers: sofascoreHeaders, timeout: SCRAPER_TIMEOUT_MS }),
      ]);

      const team1Result = (res1.data?.results ?? []).find((r: any) => r.type === 'team');
      const team2Result = (res2.data?.results ?? []).find((r: any) => r.type === 'team');

      if (!team1Result || !team2Result) {
        this.logger.warn(`[scraper] h2h: time não encontrado — ${!team1Result ? team1Name : team2Name}`);
        return null;
      }

      const team1Id: number = team1Result.entity.id;
      const team2Id: number = team2Result.entity.id;

      // 2. Busca últimos eventos do time1 (várias páginas para ter histórico suficiente)
      const pages = await Promise.all([0, 1, 2].map(p =>
        axios.get(`https://api.sofascore.com/api/v1/team/${team1Id}/events/last/${p}`,
          { headers: sofascoreHeaders, timeout: SCRAPER_TIMEOUT_MS })
          .then(r => r.data?.events ?? [])
          .catch(() => []),
      ));
      const allEvents: any[] = pages.flat();

      // 3. Filtra apenas confrontos entre os dois times
      const h2hEvents = allEvents.filter((e: any) =>
        (e.homeTeam?.id === team1Id && e.awayTeam?.id === team2Id) ||
        (e.homeTeam?.id === team2Id && e.awayTeam?.id === team1Id),
      );

      if (!h2hEvents.length) {
        this.logger.warn(`[scraper] h2h: nenhum confronto encontrado entre ${team1Name} e ${team2Name}`);
        return null;
      }

      // 4. Processa estatísticas
      let homeWins = 0, draws = 0, awayWins = 0;
      let totalGoalsHome = 0, totalGoalsAway = 0;

      const recentMatches: ScrapedH2HMatch[] = h2hEvents.slice(0, 10).map((e: any) => {
        const hScore: number = e.homeScore?.current ?? e.homeScore?.normaltime ?? 0;
        const aScore: number = e.awayScore?.current ?? e.awayScore?.normaltime ?? 0;
        const isTeam1Home: boolean = e.homeTeam?.id === team1Id;
        const t1Score = isTeam1Home ? hScore : aScore;
        const t2Score = isTeam1Home ? aScore : hScore;

        totalGoalsHome += t1Score;
        totalGoalsAway += t2Score;

        if (t1Score > t2Score) homeWins++;
        else if (t1Score < t2Score) awayWins++;
        else draws++;

        const ts: number = e.startTimestamp ?? 0;
        const date = ts ? new Date(ts * 1000).toISOString().split('T')[0] : '—';
        const tname: string = e.tournament?.name ?? e.tournament?.uniqueTournament?.name ?? '';

        return {
          date,
          homeTeam: normalizeName(e.homeTeam?.name ?? ''),
          awayTeam: normalizeName(e.awayTeam?.name ?? ''),
          homeScore: hScore,
          awayScore: aScore,
          championship: tname,
        };
      });

      const result: ScrapedH2H = {
        homeWins, draws, awayWins,
        totalGoalsHome, totalGoalsAway,
        totalMatches: h2hEvents.length,
        recentMatches,
      };

      // Cache por 12h — histórico não muda com frequência
      await this.redis.setJson(cacheKey, result, 12 * 60 * 60).catch(() => {});
      this.logger.log(`[scraper] h2h obtido: ${team1Name} vs ${team2Name} — ${h2hEvents.length} jogos`);

      return result;
    } catch (err: any) {
      this.logger.warn(`[scraper] falha ao buscar h2h ${team1Name} vs ${team2Name}: ${err.message}`);
      return null;
    }
  }
}
