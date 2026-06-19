import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { RedisService } from '../redis/redis.service';
import { translateTeam } from './translation.util';

const SCRAPER_TIMEOUT_MS = 7_000;
const CACHE_TTL_SECONDS  = 90;

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
      case 'STATUS_IN_PROGRESS': return '1H'; // ESPN doesn't expose 1H vs 2H easily
      case 'STATUS_HALFTIME':    return 'HT';
      case 'STATUS_FINAL':       return 'FT';
      case 'STATUS_EXTRA_TIME':  return 'ET';
      case 'STATUS_PENALTIES':   return 'PEN';
      case 'STATUS_POSTPONED':   return 'PST';
      default:                   return 'NS';
    }
  }
}
