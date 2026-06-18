import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TelegramService } from '../telegram/telegram.service';
import { translateTeam } from './translation.util';
import { withCache } from '../shared';

const BASE_URL = 'https://api.football-data.org/v4';
const COMPETITION_WC = 'WC';

const STATUS_MAP: Record<string, string> = {
  SCHEDULED:        'NS',
  TIMED:            'NS',
  IN_PLAY:          '1H', // refined to '2H' below based on halfTime score
  PAUSED:           'HT',
  EXTRA_TIME:       'ET',
  PENALTY_SHOOTOUT: 'PEN',
  FINISHED:         'FT',
  SUSPENDED:        'PST',
  POSTPONED:        'PST',
  CANCELLED:        'PST',
  AWARDED:          'FT',
};

function extractScore(score: any): { home: number | null; away: number | null } {
  // Pega o primeiro valor não-null disponível na ordem: fullTime > regularTime > halfTime
  // A API retorna null nos campos que ainda não têm dado — não podemos confiar em ?? sozinho
  const candidates = [
    score?.fullTime,
    score?.regularTime,
    score?.halfTime,
  ];

  for (const candidate of candidates) {
    if (candidate?.home !== null && candidate?.home !== undefined) {
      return { home: candidate.home, away: candidate.away };
    }
  }

  return { home: null, away: null };
}

@Injectable()
export class FootballApiService {
  private readonly logger = new Logger(FootballApiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly telegram: TelegramService,
  ) {}

  private get headers() {
    return { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY };
  }


  private async cacheDel(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (err) {
      this.logger.warn(`Cache DEL failed [${key}]`, err);
    }
  }

  async syncTodayMatches() {
    const today = new Date().toISOString().split('T')[0];

    const response = await axios.get(`${BASE_URL}/matches`, {
      params: { date: today },
      headers: this.headers,
    });

    const matches = response.data.matches as any[];

    let syncErrors = 0;
    for (const match of matches) {
      try {
        let mappedStatus = STATUS_MAP[match.status] ?? match.status;

        // If IN_PLAY and halfTime score exists, the match is in the 2nd half
        if (match.status === 'IN_PLAY' && match.score?.halfTime?.home !== null && match.score?.halfTime?.home !== undefined) {
          mappedStatus = '2H';
        }

        const { home: homeScore, away: awayScore } = extractScore(match.score);
        const homeTeam = translateTeam(match.homeTeam.name);
        const awayTeam = translateTeam(match.awayTeam.name);

        const existing = await this.prisma.footballMatch.findUnique({
          where: { externalId: match.id.toString() },
        });

        const saved = await this.prisma.footballMatch.upsert({
          where:  { externalId: match.id.toString() },
          update: { status: mappedStatus, homeScore, awayScore },
          create: {
            externalId:   match.id.toString(),
            date:         new Date(match.utcDate),
            championship: match.competition.name,
            homeTeam,
            awayTeam,
            status:       mappedStatus,
            homeScore,
            awayScore,
          },
        });

        await this.detectAndNotify(existing, saved, homeTeam, awayTeam);
      } catch (err) {
        syncErrors++;
        this.logger.error(`Failed to sync match ${match.id}`, err);
      }
    }

    await this.cacheDel(`matches:${today}`);
    if (syncErrors > 0) {
      this.logger.warn(`Synced with ${syncErrors} error(s) out of ${matches.length} matches for ${today}`);
    } else {
      this.logger.log(`Synced ${matches.length} matches for ${today}`);
    }
    return { synced: matches.length, errors: syncErrors };
  }

  private async detectAndNotify(prev: any, curr: any, homeTeam: string, awayTeam: string) {
    // Busca todos os usuários com Telegram ativo — sem filtro de time favorito
    const users = await this.prisma.user.findMany({
      where: {
        preferences: { receiveTelegramNotifications: true },
      },
      include: { preferences: true },
    });

    if (!users.length) return;

    const messages: string[] = [];

    // Jogo começou
    if (prev?.status === 'NS' && curr.status === '1H') {
      messages.push(
        `⚽ *Jogo começou!*
${homeTeam} x ${awayTeam}
🏆 ${curr.championship}`,
      );
    }

    // Gol — placar mudou
    const prevHome = prev?.homeScore ?? null;
    const prevAway = prev?.awayScore ?? null;
    const currHome = curr.homeScore;
    const currAway = curr.awayScore;

    const placarDisponivel = currHome !== null && currAway !== null;
    const placarMudou = placarDisponivel && (currHome !== prevHome || currAway !== prevAway);

    if (placarMudou) {
      const golsHome = currHome - (prevHome ?? 0);
      const golsAway = currAway - (prevAway ?? 0);

      for (let i = 0; i < golsHome; i++) {
        const parcialHome = (prevHome ?? 0) + i + 1;
        const parcialAway = prevAway ?? 0;
        messages.push(
          `🥅 *GOL!* ${homeTeam}
${homeTeam} ${parcialHome} x ${parcialAway} ${awayTeam}
🏆 ${curr.championship}`,
        );
      }
      for (let i = 0; i < golsAway; i++) {
        const parcialHome = prevHome ?? 0;
        const parcialAway = (prevAway ?? 0) + i + 1;
        messages.push(
          `🥅 *GOL!* ${awayTeam}
${homeTeam} ${parcialHome} x ${parcialAway} ${awayTeam}
🏆 ${curr.championship}`,
        );
      }
    }

    // Fim de jogo
    if (prev && prev.status !== 'FT' && curr.status === 'FT') {
      messages.push(
        `🏁 *Fim de jogo!*
${homeTeam} ${curr.homeScore ?? 0} x ${curr.awayScore ?? 0} ${awayTeam}
🏆 ${curr.championship}`,
      );
    }

    if (!messages.length) return;

    for (const user of users) {
      const chatId = user.preferences?.telegramChatId;
      if (!chatId) continue;
      for (const msg of messages) {
        try {
          await this.telegram.sendMessage(chatId, msg);
        } catch (err) {
          this.logger.error(`Failed to send Telegram notification to chatId=${chatId}`, err);
        }
      }
    }
  }

  async getStandings() {
    return withCache(this.redis, 'standings:wc', 300, async () => {
      const response = await axios.get(
        `${BASE_URL}/competitions/${COMPETITION_WC}/standings`,
        { headers: this.headers },
      );

      return (response.data.standings as any[]).map((group) => ({
        group: group.group ?? group.stage,
        table: group.table.map((entry: any) => ({
          position:       entry.position,
          teamId:         entry.team.id,
          teamName:       translateTeam(entry.team.name),
          crest:          entry.team.crest,
          points:         entry.points,
          played:         entry.playedGames,
          wins:           entry.won,
          draws:          entry.draw,
          losses:         entry.lost,
          goalsFor:       entry.goalsFor,
          goalsAgainst:   entry.goalsAgainst,
          goalDifference: entry.goalDifference,
        })),
      }));
    });
  }

  async getTopScorers() {
    return withCache(this.redis, 'scorers:wc:top10', 300, async () => {
      const response = await axios.get(
        `${BASE_URL}/competitions/${COMPETITION_WC}/scorers`,
        { params: { limit: 10 }, headers: this.headers },
      );

      return (response.data.scorers as any[]).map((entry) => ({
        playerId:   entry.player.id,
        playerName: entry.player.name,
        teamName:   entry.team?.name ? translateTeam(entry.team.name) : '—',
        goals:      entry.goals ?? 0,
        assists:    entry.assists ?? 0,
      }));
    });
  }
}
