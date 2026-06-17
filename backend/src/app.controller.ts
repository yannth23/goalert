import { Controller, Get, Post } from '@nestjs/common';
import { DailyEmailService } from './jobs/daily-email.service';
import { PrismaService } from './prisma/prisma.service';
import { EmailService } from './email/email.service';
import { FootballApiService } from './football-match/football-api.service';

@Controller()
export class AppController {
  constructor(
    private readonly dailyEmailService: DailyEmailService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly footballApiService: FootballApiService,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  // Endpoint temporário de teste — manda email com jogos de hoje
  @Post('test-email')
  async testEmail() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const matches = await this.prisma.footballMatch.findMany({
      where: { date: { gte: startOfDay, lte: endOfDay } },
      orderBy: { date: 'asc' },
    });

    if (!matches.length) {
      return { sent: false, reason: 'Nenhuma partida encontrada para hoje' };
    }

    const html = buildTestEmailHtml(matches);
    await this.emailService.sendDailyEmail('yannorange4@gmail.com', html);

    return { sent: true, matches: matches.length };
  }
}

function buildTestEmailHtml(matches: {
  homeTeam: string;
  awayTeam: string;
  championship: string;
  date: Date;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}[]): string {
  const rows = matches.map((m) => {
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
        <td style="padding:10px 14px;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:13px;">${m.championship}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #1e293b;font-weight:700;color:#f1f5f9;">
          ${m.homeTeam} vs ${m.awayTeam}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #1e293b;color:#eab308;font-weight:700;">
          ${scoreOrTime}
        </td>
      </tr>`;
  }).join('');

  return `
    <div style="background:#0f172a;font-family:sans-serif;padding:32px;max-width:600px;margin:0 auto;border-radius:16px;">
      <h1 style="color:#eab308;font-size:24px;margin:0 0 8px;">⚽ GoalAlert</h1>
      <p style="color:#64748b;margin:0 0 24px;font-size:14px;">Partidas de hoje — ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
      <table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:12px;overflow:hidden;">
        <thead>
          <tr style="background:#1e293b;">
            <th style="padding:10px 14px;text-align:left;color:#475569;font-size:12px;text-transform:uppercase;">Competição</th>
            <th style="padding:10px 14px;text-align:left;color:#475569;font-size:12px;text-transform:uppercase;">Jogo</th>
            <th style="padding:10px 14px;text-align:left;color:#475569;font-size:12px;text-transform:uppercase;">Horário</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#334155;font-size:12px;margin-top:24px;text-align:center;">
        Você recebeu este email pois está cadastrado no GoalAlert.
      </p>
    </div>
  `;
}
