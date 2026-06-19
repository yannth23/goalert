import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  constructor(private readonly prisma: PrismaService) {}

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
      homeTactics: this.generateSimulatedTactics(homeTeam),
      awayTactics: this.generateSimulatedTactics(awayTeam),
    };
  }

  private generateSimulatedTactics(teamName: string): TacticalAnalysis {
    const formations = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2'];
    const players = [
      'Alisson', 'Ederson', 'Marquinhos', 'Thiago Silva', 'Casemiro', 
      'Paquetá', 'Neymar', 'Vinícius Jr', 'Rodrygo', 'Richarlison',
      'Mbappé', 'Messi', 'Cristiano Ronaldo', 'De Bruyne', 'Haaland',
      'Kane', 'Salah', 'Lewandowski', 'Modric', 'Kroos'
    ];

    // Gera heatmap aleatório
    const heatmapData = Array.from({ length: 15 }, () => ({
      x: Math.floor(Math.random() * 100),
      y: Math.floor(Math.random() * 100),
      value: Math.random()
    }));

    return {
      formation: formations[Math.floor(Math.random() * formations.length)],
      lineup: Array.from({ length: 11 }, (_, i) => players[Math.floor(Math.random() * players.length)]),
      keyPlayer: players[Math.floor(Math.random() * players.length)],
      possession: 45 + Math.random() * 10,
      intensity: 70 + Math.random() * 25,
      heatmapData
    };
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
      },
    });

    this.logger.log(`Updated predictions for match ${matchId}`);
  }
}
