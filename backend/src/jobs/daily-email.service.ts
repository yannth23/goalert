import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { FootballApiService } from '../football-match/football-api.service';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class DailyEmailService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DailyEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly footballApiService: FootballApiService,
    private readonly telegram: TelegramService,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Bootstrap sync...');
    try {
      const result = await this.footballApiService.syncTodayMatches();
      this.logger.log(`Bootstrap sync done — ${result.synced} matches`);
    } catch (err) {
      this.logger.error('Bootstrap sync failed', err);
    }
  }

  @Cron('0 7 * * *', { name: 'sync-matches-job' })
  async syncMatches(): Promise<void> {
    try {
      const result = await this.footballApiService.syncTodayMatches();
      this.logger.log(`Cron sync done — ${result.synced} matches`);
    } catch (err) {
      this.logger.error('Cron sync failed', err);
    }
  }

  @Cron('*/2 12-23 * * *', { name: 'sync-live-matches' })
  async syncLiveMatches(): Promise<void> {
    try {
      const result = await this.footballApiService.syncTodayMatches();
      this.logger.log(`Live sync done — ${result.synced} matches`);
    } catch (err) {
      this.logger.error('Live sync failed', err);
    }
  }

  @Cron('0 8 * * *', { name: 'daily-job' })
  async runDailyJob(): Promise<void> {
    this.logger.log('Starting daily job...');

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);

    const matches = await this.prisma.footballMatch.findMany({
      where: { date: { gte: startOfDay, lte: endOfDay } },
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
      const favoriteTeams = user.favoriteTeams.map((t) => t.teamName);
      const filtered = matches.filter(
        (m) => favoriteTeams.includes(m.homeTeam) || favoriteTeams.includes(m.awayTeam),
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

    this.logger.log(`Done — emails: ${emailSent}, Telegram: ${telegramSent}`);
  }
}

function buildTelegramSummary(
  matches: { homeTeam: string; awayTeam: string; date: Date }[],
): string {
  const lines = matches.map((m) => {
    const time = m.date.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Recife',
    });
    return `\u25aa ${m.homeTeam} x ${m.awayTeam} \u2014 ${time}`;
  });
  return `\u26bd *GoalAlert \u2014 Jogos de Hoje*\n\n${lines.join('\n')}\n\n_Boa sorte pro seu time!_ \ud83c\udfc6`;
}

function buildEmailHtml(
  matches: {
    homeTeam: string;
    awayTeam: string;
    championship: string;
    date: Date;
    homeScore: number | null;
    awayScore: number | null;
    status: string;
  }[],
): string {
  const rows = matches
    .map((m) => {
      const time = m.date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Recife',
      });
      const scoreOrTime =
        m.homeScore !== null && m.awayScore !== null
          ? `${m.homeScore} x ${m.awayScore}`
          : time;

      const td = (val: string, extra = '') =>
        `<td style="padding:8px 12px;border-bottom:1px solid #eee;${extra}">${val}<\/td>`;

      return [
        '<tr>',
        td(m.championship),
        td(`${m.homeTeam} vs ${m.awayTeam}`, 'font-weight:600;'),
        td(scoreOrTime, 'color:#666;'),
        '<\/tr>',
      ].join('');
    })
    .join('');

  return [
    '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">',
    '<h2 style="color:#16a34a;">\u26bd GoalAlert \u2014 Partidas de Hoje<\/h2>',
    '<table style="width:100%;border-collapse:collapse;">',
    '<thead><tr style="background:#f3f4f6;">',
    '<th style="padding:8px 12px;text-align:left;">Competi\u00e7\u00e3o<\/th>',
    '<th style="padding:8px 12px;text-align:left;">Jogo<\/th>',
    '<th style="padding:8px 12px;text-align:left;">Hor\u00e1rio \/ Placar<\/th>',
    '<\/tr><\/thead>',
    `<tbody>${rows}<\/tbody>`,
    '<\/table>',
    '<p style="color:#999;font-size:12px;margin-top:24px;">Para cancelar, acesse suas prefer\u00eancias no GoalAlert.<\/p>',
    '<\/div>',
  ].join('');
}
