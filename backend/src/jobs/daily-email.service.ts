import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { FootballApiService } from '../football-match/football-api.service';
import { TelegramService } from '../telegram/telegram.service';
import { getTodayRange, formatMatchTime } from '../shared';

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'PEN']);

@Injectable()
export class DailyEmailService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DailyEmailService.name);
  private syncRunning = false; // guard against overlapping syncs

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly footballApiService: FootballApiService,
    private readonly telegram: TelegramService,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Bootstrap sync…');
    try {
      const r = await this.footballApiService.syncTodayMatches();
      this.logger.log(`Bootstrap sync done — ${r.synced} matches, ${r.live} live`);
    } catch (err) {
      this.logger.error('Bootstrap sync failed', err);
    }
  }

  /** Pre-load the day's schedule at 7am. */
  @Cron('0 7 * * *', { name: 'sync-matches-morning' })
  async syncMorning(): Promise<void> {
    await this.runSync('morning');
  }

  /**
   * Live sync: runs every minute around the clock.
   *
   * Copa do Mundo 2026 spans USA/Canada/Mexico — games can start as late as
   * 22:00 local (PDT = UTC-7), meaning they run until ~02:00 UTC.
   * Running every minute all day uses only 1 API call/min (free plan allows 10/min).
   */
  @Cron('* * * * *', { name: 'sync-live-matches' })
  async syncLiveMatches(): Promise<void> {
    // Skip if there are no live or upcoming matches today
    // (avoids unnecessary API calls at 3am when no games are running)
    const hasActivity = await this.hasLiveOrUpcomingToday();
    if (!hasActivity) return;

    await this.runSync('live');
  }

  /** Daily notification at 8am. */
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
        OR: [
          { preferences: { receiveDailyNotifications: true } },
          { preferences: { receiveTelegramNotifications: true } },
        ],
      },
      include: { favoriteTeams: true, preferences: true },
    });

    let emailSent = 0, telegramSent = 0;

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

      const chatId = user.preferences?.telegramChatId;
      if (user.preferences?.receiveTelegramNotifications && chatId) {
        try {
          await this.telegram.sendMessage(chatId, buildTelegramSummary(filtered));
          telegramSent++;
        } catch (err) {
          this.logger.error(`Telegram failed for chatId=${chatId}`, err);
        }
      }
    }

    this.logger.log(`Notifications done — emails: ${emailSent}, Telegram: ${telegramSent}`);
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
      if (r.live > 0 || r.errors > 0) {
        // Only log when something interesting happened to avoid log spam
        this.logger.log(`[${label}] sync — ${r.synced} matches, ${r.live} live, ${r.errors} errors`);
      }
    } catch (err) {
      this.logger.error(`[${label}] sync failed`, err);
    } finally {
      this.syncRunning = false;
    }
  }

  /** Returns true if there are any live or future matches today (avoids wasted API calls). */
  private async hasLiveOrUpcomingToday(): Promise<boolean> {
    const { start, end } = getTodayRange();
    const count = await this.prisma.footballMatch.count({
      where: {
        date: { gte: start, lte: end },
        status: { in: ['NS', '1H', 'HT', '2H', 'ET', 'PEN'] },
      },
    });
    return count > 0;
  }
}

// ── Email/Telegram builders (unchanged) ───────────────────────────────────────

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
