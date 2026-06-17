import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { FootballApiService } from '../football-match/football-api.service';

@Injectable()
export class DailyEmailService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DailyEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly footballApiService: FootballApiService,
  ) {}

  // Roda uma vez assim que o app sobe
  async onApplicationBootstrap() {
    this.logger.log('Bootstrap sync: syncing today matches...');
    try {
      const result = await this.footballApiService.syncTodayMatches();
      this.logger.log(`Bootstrap sync done — ${result.synced} matches`);
    } catch (err) {
      this.logger.error('Bootstrap sync failed', err);
    }
  }

  // Sync das partidas às 7h UTC (4h Brasília)
  @Cron('0 7 * * *', { name: 'sync-matches-job' })
  async syncMatches(): Promise<void> {
    this.logger.log('Cron sync: syncing today matches...');
    try {
      const result = await this.footballApiService.syncTodayMatches();
      this.logger.log(`Cron sync done — ${result.synced} matches`);
    } catch (err) {
      this.logger.error('Cron sync failed', err);
    }
  }

  // Sync a cada 2 minutos das 12h às 23h UTC (9h às 20h Brasília)
  @Cron('*/2 12-23 * * *', { name: 'sync-live-matches' })
  async syncLiveMatches(): Promise<void> {
    this.logger.log('Live sync: atualizando partidas...');
    try {
      const result = await this.footballApiService.syncTodayMatches();
      this.logger.log(`Live sync done — ${result.synced} matches`);
    } catch (err) {
      this.logger.error('Live sync failed', err);
    }
  }

  // Envio dos emails às 8h UTC (5h Brasília)
  @Cron('0 8 * * *', { name: 'daily-email-job' })
  async runDailyEmailJob(): Promise<void> {
    this.logger.log('Starting daily email job...');

    const users = await this.prisma.user.findMany({
      where: {
        preferences: { receiveDailyNotifications: true },
      },
      include: { favoriteTeams: true },
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const matches = await this.prisma.footballMatch.findMany({
      where: { date: { gte: startOfDay, lte: endOfDay } },
      orderBy: { date: 'asc' },
    });

    let sent = 0;
    let skipped = 0;

    for (const user of users) {
      const favoriteTeams = user.favoriteTeams.map((t) => t.teamName);

      const filteredMatches = matches.filter(
        (m) =>
          favoriteTeams.includes(m.homeTeam) ||
          favoriteTeams.includes(m.awayTeam),
      );

      if (!filteredMatches.length) {
        skipped++;
        continue;
      }

      try {
        await this.emailService.sendDailyEmail(
          user.email,
          buildEmailHtml(filteredMatches),
        );
        sent++;
      } catch (err) {
        this.logger.error(`Failed to send email to ${user.email}`, err);
      }
    }

    this.logger.log(`Done — sent: ${sent}, skipped: ${skipped}`);
  }
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

      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${m.championship}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;">
            ${m.homeTeam} vs ${m.awayTeam}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;">
            ${scoreOrTime}
          </td>
        </tr>`;
    })
    .join('');

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#16a34a;">⚽ GoalAlert — Partidas de Hoje</h2>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;">Competição</th>
            <th style="padding:8px 12px;text-align:left;">Jogo</th>
            <th style="padding:8px 12px;text-align:left;">Horário / Placar</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#999;font-size:12px;margin-top:24px;">
        Para cancelar notificações, acesse suas preferências no GoalAlert.
      </p>
    </div>
  `;
}
