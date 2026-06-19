import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';

interface TeamStatistics {
  totalMatches: number;
  totalGoalsFor: number;
  totalGoalsAgainst: number;
  totalCards: number;
  totalFouls: number;
  averageGoalsFor: number;
  averageGoalsAgainst: number;
  averageCards: number;
  averageFouls: number;
}

interface TacticalAnalysis {
  formation: string;
  lineup: string[];
  keyPlayer: string;
  possession: number;
  intensity: number; // 0-100
  heatmapData: { x: number; y: number; value: number }[];
}

interface PredictionResult {
  predictedGoalsHome: number;
  predictedGoalsAway: number;
  predictedCards: number;
  predictedFouls: number;
  homeTactics?: TacticalAnalysis;
  awayTactics?: TacticalAnalysis;
}

@Injectable()
export class StatisticsPredictorService {
  private readonly logger = new Logger(StatisticsPredictorService.name);
  private readonly openai: OpenAI;

  constructor(private readonly prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }

  /**
   * Calcula estatísticas de um time baseado em seus últimos jogos.
   * Considera apenas jogos finalizados (status = 'FT').
   */
  async getTeamStatistics(teamName: string, limit: number = 10): Promise<TeamStatistics> {
    const matches = await this.prisma.footballMatch.findMany({
      where: {
        status: 'FT',
        OR: [
          { homeTeam: teamName },
          { awayTeam: teamName },
        ],
      },
      orderBy: { date: 'desc' },
      take: limit,
    });

    if (matches.length === 0) {
      return {
        totalMatches: 0,
        totalGoalsFor: 0,
        totalGoalsAgainst: 0,
        totalCards: 0,
        totalFouls: 0,
        averageGoalsFor: 0,
        averageGoalsAgainst: 0,
        averageCards: 0,
        averageFouls: 0,
      };
    }

    let totalGoalsFor = 0;
    let totalGoalsAgainst = 0;
    let totalCards = 0;
    let totalFouls = 0;

    for (const match of matches) {
      const isHome = match.homeTeam === teamName;
      const goalsFor = isHome ? (match.homeScore ?? 0) : (match.awayScore ?? 0);
      const goalsAgainst = isHome ? (match.awayScore ?? 0) : (match.homeScore ?? 0);

      totalGoalsFor += goalsFor;
      totalGoalsAgainst += goalsAgainst;
      totalCards += match.predictedCards ?? 0;
      totalFouls += match.predictedFouls ?? 0;
    }

    const count = matches.length;

    return {
      totalMatches: count,
      totalGoalsFor,
      totalGoalsAgainst,
      totalCards,
      totalFouls,
      averageGoalsFor: totalGoalsFor / count,
      averageGoalsAgainst: totalGoalsAgainst / count,
      averageCards: totalCards / count,
      averageFouls: totalFouls / count,
    };
  }

  /**
   * Prediz estatísticas para um jogo específico baseado no histórico dos times.
   * Usa a média dos últimos 10 jogos de cada time.
   */
  async predictMatch(homeTeam: string, awayTeam: string): Promise<PredictionResult> {
    const [homeStats, awayStats] = await Promise.all([
      this.getTeamStatistics(homeTeam, 10),
      this.getTeamStatistics(awayTeam, 10),
    ]);

    // Se não há histórico, usa valores padrão
    if (homeStats.totalMatches === 0 || awayStats.totalMatches === 0) {
      return {
        predictedGoalsHome: 1.5,
        predictedGoalsAway: 1.5,
        predictedCards: 4,
        predictedFouls: 22,
        homeTactics: await this.generateSimulatedTactics(homeTeam),
        awayTactics: await this.generateSimulatedTactics(awayTeam),
      };
    }

    // Predição de gols: média dos gols que o time marcou + média dos gols que o adversário sofreu
    const predictedGoalsHome = (homeStats.averageGoalsFor + awayStats.averageGoalsAgainst) / 2;
    const predictedGoalsAway = (awayStats.averageGoalsFor + homeStats.averageGoalsAgainst) / 2;

    // Predição de cartões: média dos cartões dos dois times
    const predictedCards = Math.round((homeStats.averageCards + awayStats.averageCards) / 2);

    // Predição de faltas: média das faltas dos dois times
    const predictedFouls = Math.round((homeStats.averageFouls + awayStats.averageFouls) / 2);

    return {
      predictedGoalsHome: Math.max(0, predictedGoalsHome),
      predictedGoalsAway: Math.max(0, predictedGoalsAway),
      predictedCards: Math.max(0, predictedCards),
      predictedFouls: Math.max(0, predictedFouls),
      homeTactics: await this.generateSimulatedTactics(homeTeam),
      awayTactics: await this.generateSimulatedTactics(awayTeam),
    };
  }

  private async generateSimulatedTactics(teamName: string): Promise<TacticalAnalysis> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: "Você é um analista tático de futebol. Forneça dados reais e precisos em formato JSON."
          },
          {
            role: "user",
            content: `Forneça a formação tática provável, a escalação de 11 jogadores reais, o jogador chave, a posse de bola média esperada (0-100), a intensidade de jogo (0-100) e o foco tático (wings, center, defense, counter, balanced) para o time: ${teamName}.
            Responda APENAS o JSON no formato:
            {
              "formation": "string",
              "lineup": ["string", ...],
              "keyPlayer": "string",
              "possession": number,
              "intensity": number,
              "focus": "string"
            }`
          }
        ],
        response_format: { type: "json_object" }
      } as any);

      const data = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        formation: data.formation || '4-4-2',
        lineup: data.lineup || [],
        keyPlayer: data.keyPlayer || 'Star Player',
        possession: data.possession || 50,
        intensity: data.intensity || 75,
        heatmapData: this.generateHeatmap(data.focus || 'balanced')
      };
    } catch (error) {
      this.logger.error(`Erro ao gerar táticas via AI para ${teamName}: ${error.message}`);
      return {
        formation: '4-4-2',
        lineup: ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6', 'Player 7', 'Player 8', 'Player 9', 'Player 10', 'Player 11'],
        keyPlayer: 'Star Player',
        possession: 50,
        intensity: 75,
        heatmapData: this.generateHeatmap('balanced')
      };
    }
  }

  private generateHeatmap(focus: string) {
    const points = [];
    for (let i = 0; i < 20; i++) {
      let x, y;
      if (focus === 'wings') {
        x = Math.random() > 0.5 ? Math.random() * 20 + 80 : Math.random() * 20;
        y = Math.random() * 100;
      } else if (focus === 'center') {
        x = Math.random() * 40 + 30;
        y = Math.random() * 40 + 30;
      } else if (focus === 'defense') {
        x = Math.random() * 100;
        y = Math.random() * 30 + 70;
      } else if (focus === 'counter') {
        x = Math.random() * 100;
        y = Math.random() * 40;
      } else {
        x = Math.random() * 100;
        y = Math.random() * 100;
      }
      points.push({ x: Math.floor(x), y: Math.floor(y), value: Math.random() });
    }
    return points;
  }

  /**
   * Atualiza as predições de um jogo no banco de dados.
   */
  async updateMatchPredictions(matchId: string): Promise<void> {
    const match = await this.prisma.footballMatch.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      this.logger.warn(`Match ${matchId} not found`);
      return;
    }

    const predictions = await this.predictMatch(match.homeTeam, match.awayTeam);

    await this.prisma.footballMatch.update({
      where: { id: matchId },
        data: {
        predictedGoalsHome: predictions.predictedGoalsHome,
        predictedGoalsAway: predictions.predictedGoalsAway,
        predictedCards: predictions.predictedCards,
        predictedFouls: predictions.predictedFouls,
        homeTactics: predictions.homeTactics as any,
        awayTactics: predictions.awayTactics as any,
      },
    });

    this.logger.log(`Updated predictions for match ${matchId}`);
  }
}
