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

  /** Public entry-point: returns today's matches from the best available scraper. */
  async scrapeTodayMatches(): Promise<ScrapedMatch[]> {
    const today    = new Date().toISOString().split('T')[0];
    const cacheKey = `scraper:today:${today}`;

    // Return cached results if fresh enough
    try {
      const cached = await this.redis.getJson<ScrapedMatch[]>(cacheKey);
      if (cached && cached.length > 0) {
        this.logger.log(`[scraper] cache hit — ${cached.length} matches`);
        return cached;
      }
    } catch { /* cache miss is OK */ }

    // 1st source: SofaScore JSON API
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

    // 2nd source: ESPN public scoreboard
    try {
      const matches = await this.fetchESPN();
      if (matches.length > 0) {
        await this.redis.setJson(cacheKey, matches, CACHE_TTL_SECONDS).catch(() => {});
        this.logger.log(`[scraper] ESPN — ${matches.length} matches`);
        return matches;
      }
    } catch (err: any) {
      this.logger.warn(`[scraper] ESPN failed: ${err.message}`);
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

  // ── ESPN public API ────────────────────────────────────────────────────────
  private async fetchESPN(): Promise<ScrapedMatch[]> {
    const res = await axios.get(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard',
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
   * Tenta buscar a escalação mais recente do time via Sofascore.
   * Retorna lista com os 11 titulares ou [] se falhar.
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

    try {
      const sofascoreHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Referer': 'https://www.sofascore.com/',
        'Accept': 'application/json',
      };

      // 1. Busca ID do time pelo nome
      const searchRes = await axios.get(
        `https://api.sofascore.com/api/v1/search/all?q=${encodeURIComponent(teamName)}&page=0`,
        { headers: sofascoreHeaders, timeout: SCRAPER_TIMEOUT_MS },
      );

      const teamResult = (searchRes.data?.results ?? [])
        .find((r: any) => r.type === 'team');
      if (!teamResult) {
        this.logger.warn(`[scraper] time não encontrado no Sofascore: ${teamName}`);
        return [];
      }
      const teamId: number = teamResult.entity.id;

      // 2. Pega últimos eventos do time
      const eventsRes = await axios.get(
        `https://api.sofascore.com/api/v1/team/${teamId}/events/last/0`,
        { headers: sofascoreHeaders, timeout: SCRAPER_TIMEOUT_MS },
      );

      const events: any[] = eventsRes.data?.events ?? [];
      // Prefere jogo da Copa do Mundo, senão pega o mais recente
      const worldCupEvent = events.reverse().find((e: any) => {
        const tname = (e.tournament?.name ?? e.tournament?.uniqueTournament?.name ?? '').toLowerCase();
        return tname.includes('world cup') || tname.includes('mundial');
      });
      const targetEvent = worldCupEvent ?? events[events.length - 1];
      if (!targetEvent) return [];

      const eventId: number = targetEvent.id;

      // 3. Busca a escalação do jogo
      const lineupRes = await axios.get(
        `https://api.sofascore.com/api/v1/event/${eventId}/lineups`,
        { headers: sofascoreHeaders, timeout: SCRAPER_TIMEOUT_MS },
      );

      // Determina se o time é home ou away
      const homeId: number = targetEvent.homeTeam?.id;
      const side = homeId === teamId ? lineupRes.data?.home : lineupRes.data?.away;
      if (!side?.players) return [];

      const starters: string[] = (side.players as any[])
        .filter((p: any) => !p.substitute)
        .map((p: any) => p.player?.name ?? p.player?.shortName ?? '')
        .filter(Boolean)
        .slice(0, 11);

      if (starters.length >= 11) {
        // Cache por 6h — escalação não muda tão rápido
        await this.redis.setJson(cacheKey, starters, 6 * 60 * 60).catch(() => {});
        this.logger.log(`[scraper] escalação obtida para ${teamName}: ${starters.join(', ')}`);
      }

      return starters;
    } catch (err: any) {
      this.logger.warn(`[scraper] falha ao buscar escalação de ${teamName}: ${err.message}`);
      return [];
    }
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
