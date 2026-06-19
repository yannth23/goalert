import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { FootballApiService } from '../football-match/football-api.service';
// Telegram removido
import { getTodayRange, formatMatchTime } from '../shared';
import { StatisticsPredictorService } from '../football-match/statistics-predictor.service';

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'PEN']);

@Injectable()
export class DailyEmailService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DailyEmailService.name);
  private syncRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly footballApiService: FootballApiService,
    private readonly predictor: StatisticsPredictorService,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Bootstrap sync…');
    try {
      const r = await this.footballApiService.syncTodayMatches();
      this.logger.log(`Bootstrap sync done — ${r.synced} matches, ${r.live} live [${r.source}]`);
      await this.generateTacticsForToday();
    } catch (err) {
      this.logger.error('Bootstrap sync failed', err);
    }
  }

  /** Gera táticas para todos os jogos de hoje que ainda não têm análise */
  private async generateTacticsForToday(): Promise<void> {
    try {
      const { start, end } = getTodayRange();
      const matches = await this.prisma.footballMatch.findMany({
        where: {
          date: { gte: start, lte: end },
          homeTactics: null,
        },
        select: { id: true, homeTeam: true, awayTeam: true },
      });

      if (!matches.length) {
        this.logger.log('Tactics already generated for all today matches');
        return;
      }

      this.logger.log(`Generating tactics for ${matches.length} matches...`);
      for (const match of matches) {
        try {
          await this.predictor.updateMatchPredictions(match.id);
          this.logger.log(`Tactics generated: ${match.homeTeam} x ${match.awayTeam}`);
        } catch (err: any) {
          this.logger.error(`Failed to generate tactics for ${match.homeTeam} x ${match.awayTeam}: ${err.message}`);
        }
      }
      this.logger.log('Tactics generation complete');
    } catch (err: any) {
      this.logger.error('generateTacticsForToday failed', err.message);
    }
  }

  /** Pre-load the day's schedule at 7am UTC. */
  @Cron('0 7 * * *', { name: 'sync-matches-morning' })
  async syncMorning(): Promise<void> {
    await this.runSync('morning');
  }

  /**
   * Live sync — every minute, all day.
   *
   * Guard: only hits the API when there is something to update.
   * Special case: if the DB has ZERO matches for today we also sync,
   * so that an empty database can be seeded even if the bootstrap
   * or 7am cron failed (e.g. the API was down at that time).
   */
  /**
   * Live sync — a cada 30 segundos durante jogos ao vivo.
   */
  @Cron('*/30 * * * * *', { name: 'sync-live-matches' })
  async syncLiveMatches(): Promise<void> {
    const hasActivity = await this.hasLiveOrUpcomingToday();
    if (!hasActivity) return;
    await this.runSync('live');
  }

  /** Daily notification at 8am UTC. */
  @Cron('0 8 * * *', { name: 'daily-job' })
  async runDailyJob(): Promise<void> {
    this.logger.log('Starting daily notification job…');
    const { start, end } = getTodayRange();

    const matches = await this.prisma.footballMatch.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });

    const users = await this.prisma.user.findMany({
      where: {
        preferences: { receiveDailyNotifications: true },
      },
      include: { favoriteTeams: true, preferences: true },
    });

    let emailSent = 0;

    for (const user of users) {
      const favoriteTeams = user.favoriteTeams.map(t => t.teamName);
      const filtered = matches.filter(
        m => favoriteTeams.includes(m.homeTeam) || favoriteTeams.includes(m.awayTeam),
      );
      if (!filtered.length) continue;

      if (user.preferences?.receiveDailyNotifications) {
        try {
          await this.emailService.sendDailyEmail(user.email, buildEmailHtml(filtered));
          emailSent++;
        } catch (err) {
          this.logger.error(`Email failed for ${user.email}`, err);
        }
      }
    }

    this.logger.log(`Notifications done — emails: ${emailSent}`);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async runSync(label: string): Promise<void> {
    if (this.syncRunning) {
      this.logger.warn(`[${label}] sync skipped — previous run still in progress`);
      return;
    }
    this.syncRunning = true;
    try {
      const r = await this.footballApiService.syncTodayMatches();
      if (r.live > 0 || r.errors > 0 || r.synced > 0) {
        this.logger.log(`[${label}] sync — ${r.synced} matches, ${r.live} live, ${r.errors} errors [${r.source}]`);
      }
    } catch (err) {
      this.logger.error(`[${label}] sync failed`, err);
    } finally {
      this.syncRunning = false;
    }
  }

  /**
   * Returns true when the minute cron should hit the API.
   *
   * Cases that return TRUE (sync needed):
   *  1. DB has zero matches for today → needs seeding (e.g. bootstrap failed)
   *  2. There are NS/live matches → need live updates
   *
   * Cases that return FALSE (skip to save API quota):
   *  - DB has matches for today but all are FT/PST → tournament day is over
   */
  private async hasLiveOrUpcomingToday(): Promise<boolean> {
    // Usa horário do Brasil para garantir que jogos à meia-noite UTC apareçam
    const { start, end } = getTodayRange();

    const [total, active] = await Promise.all([
      this.prisma.footballMatch.count({ where: { date: { gte: start, lte: end } } }),
      this.prisma.footballMatch.count({
        where: {
          date:   { gte: start, lte: end },
          status: { in: ['NS', '1H', 'HT', '2H', 'ET', 'PEN'] },
        },
      }),
    ]);

    // Seed an empty day OR keep updating active matches
    return total === 0 || active > 0;
  }
}

// ── Email/Telegram builders ───────────────────────────────────────────────────

function buildTelegramSummary(
  matches: { homeTeam: string; awayTeam: string; date: Date }[],
): string {
  const lines = matches.map(m => {
    const time = formatMatchTime(m.date);
    return `▪ ${m.homeTeam} x ${m.awayTeam} — ${time}`;
  });
  return `⚽ *GoalAlert — Jogos de Hoje*\n\n${lines.join('\n')}\n\n_Boa sorte pro seu time!_ 🏆`;
}

function buildEmailHtml(
  matches: {
    homeTeam: string; awayTeam: string; championship: string;
    date: Date; homeScore: number | null; awayScore: number | null; status: string;
  }[],
): string {
  const rows = matches.map(m => {
    const time = formatMatchTime(m.date);
    const scoreOrTime =
      m.homeScore !== null && m.awayScore !== null
        ? `${m.homeScore} x ${m.awayScore}`
        : time;
    const td = (val: string, extra = '') =>
      `<td style="padding:8px 12px;border-bottom:1px solid #eee;${extra}">${val}</td>`;
    return `<tr>${td(m.championship)}${td(`${m.homeTeam} vs ${m.awayTeam}`, 'font-weight:600;')}${td(scoreOrTime, 'color:#666;')}</tr>`;
  }).join('');

  return [
    '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">',
    '<h2 style="color:#16a34a;">⚽ GoalAlert — Partidas de Hoje</h2>',
    '<table style="width:100%;border-collapse:collapse;">',
    '<thead><tr style="background:#f3f4f6;">',
    '<th style="padding:8px 12px;text-align:left;">Competição</th>',
    '<th style="padding:8px 12px;text-align:left;">Jogo</th>',
    '<th style="padding:8px 12px;text-align:left;">Horário / Placar</th>',
    '</tr></thead>',
    `<tbody>${rows}</tbody>`,
    '</table>',
    '<p style="color:#999;font-size:12px;margin-top:24px;">Para cancelar, acesse suas preferências no GoalAlert.</p>',
    '</div>',
  ].join('');
}
