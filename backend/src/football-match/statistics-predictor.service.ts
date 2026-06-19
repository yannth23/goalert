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
  aiAnalysis?: string;
}

@Injectable()
export class StatisticsPredictorService {
  private readonly logger = new Logger(StatisticsPredictorService.name);
  private readonly openai: OpenAI;

  constructor(private readonly prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }

  /**
   * Calcula estatísticas de um time baseado em seus últimos jogos.
   * Considera apenas jogos finalizados (status = 'FT').
   */
  async getTeamStatistics(teamName: string, limit: number = 10): Promise<TeamStatistics> {
    // Busca em todas as competições, não apenas na atual
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

    const homeTacticsRaw = await this.generateSimulatedTactics(homeTeam);
    const awayTacticsRaw = await this.generateSimulatedTactics(awayTeam);

    // Criamos cópias para garantir a normalização sem mutar os objetos de forma errada
    const homeTactics = { ...homeTacticsRaw };
    const awayTactics = { ...awayTacticsRaw };

    // Normalização da Posse de Bola: A soma deve ser exatamente 100%
    const rawHome = homeTactics.possession || 50;
    const rawAway = awayTactics.possession || 50;
    const total = rawHome + rawAway;
    
    homeTactics.possession = Math.round((rawHome / total) * 100);
    awayTactics.possession = 100 - homeTactics.possession;

    const aiAnalysis = await this.generateAiAnalysis(homeTeam, awayTeam, homeTactics, awayTactics);

    return {
      predictedGoalsHome: Math.max(0, predictedGoalsHome),
      predictedGoalsAway: Math.max(0, predictedGoalsAway),
      predictedCards: Math.max(0, predictedCards),
      predictedFouls: Math.max(0, predictedFouls),
      homeTactics,
      awayTactics,
      aiAnalysis,
    };
  }

  private async generateSimulatedTactics(teamName: string): Promise<TacticalAnalysis> {
    const models = [
      { model: 'llama-3.3-70b-versatile', name: 'Groq Llama 3.3' },
      { model: 'llama-3.1-8b-instant', name: 'Groq Llama 3.1 8B' },
      { model: 'qwen/qwen3-32b', name: 'Groq Qwen 32B' },
    ];

    for (const { model, name } of models) {
      const client = this.openai; 
      try {
        this.logger.log(`Tentando gerar táticas para ${teamName} usando ${name}...`);
        const response = await client.chat.completions.create({
          model: model,
          messages: [
            {
              role: "system",
              content: "Você é um analista tático de futebol de elite. Sua missão é fornecer análises REAIS e VARIADAS. Evite repetir formações como 4-2-3-1 se não for a realidade absoluta do time."
            },
            {
              role: "user",
              content: `Analise a seleção: ${teamName} baseando-se APENAS nos últimos 3 jogos oficiais. 
              Forneça:
              1. Formação tática REAL utilizada nos últimos 3 jogos.
              2. Escalação provável com os 11 nomes REAIS e MAIS RECENTES (titulares dos últimos jogos).
              3. O jogador estrela atual (Key Player).
              4. Porcentagem de posse de bola esperada (0-100).
              5. Intensidade/Agressividade (0-100).
              6. Foco de ataque (wings, center, defense, counter, balanced).
              
              Responda APENAS o JSON:
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
          formation: data.formation || '4-3-3',
          lineup: data.lineup && data.lineup.length >= 11 ? data.lineup : ['Jogador 1', 'Jogador 2', 'Jogador 3', 'Jogador 4', 'Jogador 5', 'Jogador 6', 'Jogador 7', 'Jogador 8', 'Jogador 9', 'Jogador 10', 'Jogador 11'],
          keyPlayer: data.keyPlayer || 'Destaque',
          possession: data.possession || 50,
          intensity: data.intensity || 70,
          heatmapData: this.generateHeatmap(data.focus || 'balanced')
        };
      } catch (error) {
        this.logger.error(`Falha ao usar ${name} para ${teamName}: ${error.message}`);
        continue; // Tenta o próximo modelo
      }
    }

    // Fallback final se todos os modelos falharem
    this.logger.error(`Todos os modelos de IA falharam para ${teamName}. Usando fallback genérico.`);
    return {
      formation: '4-4-2',
      lineup: ['Titular 1', 'Titular 2', 'Titular 3', 'Titular 4', 'Titular 5', 'Titular 6', 'Titular 7', 'Titular 8', 'Titular 9', 'Titular 10', 'Titular 11'],
      keyPlayer: 'Jogador Chave',
      possession: 50,
      intensity: 75,
      heatmapData: this.generateHeatmap('balanced')
    };
  }

  private async generateAiAnalysis(homeTeam: string, awayTeam: string, homeTactics: TacticalAnalysis, awayTactics: TacticalAnalysis): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: "system",
            content: "Você é um analista tático de futebol. Escreva um parágrafo curto e profissional (máximo 300 caracteres) em português sobre o confronto tático."
          },
          {
            role: "user",
            content: `Analise o confronto: ${homeTeam} (${homeTactics.formation}) vs ${awayTeam} (${awayTactics.formation}). 
            Destaque como o estilo de jogo de ${homeTactics.keyPlayer} e ${awayTactics.keyPlayer} influenciará o resultado.`
          }
        ]
      });
      return response.choices[0].message.content || '';
    } catch (error) {
      return `Confronto equilibrado entre ${homeTeam} e ${awayTeam}. Espera-se um jogo tático com foco nas formações ${homeTactics.formation} e ${awayTactics.formation}.`;
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
