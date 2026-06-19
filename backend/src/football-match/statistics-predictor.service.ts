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
  intensity: number;
  focus: string;
  dominanceStyle: 'possession' | 'counter' | 'pressing' | 'defensive' | 'balanced';
  dominanceDescription: string;
  gameDominanceProb: number; // 0-100: probabilidade de dominar o jogo (soma dos dois times = 100)
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
        totalMatches: 0, totalGoalsFor: 0, totalGoalsAgainst: 0,
        totalCards: 0, totalFouls: 0, averageGoalsFor: 0,
        averageGoalsAgainst: 0, averageCards: 0, averageFouls: 0,
      };
    }

    let totalGoalsFor = 0, totalGoalsAgainst = 0, totalCards = 0, totalFouls = 0;

    for (const match of matches) {
      const isHome = match.homeTeam === teamName;
      totalGoalsFor     += isHome ? (match.homeScore ?? 0) : (match.awayScore ?? 0);
      totalGoalsAgainst += isHome ? (match.awayScore ?? 0) : (match.homeScore ?? 0);
      totalCards  += match.predictedCards ?? 0;
      totalFouls  += match.predictedFouls ?? 0;
    }

    const count = matches.length;
    return {
      totalMatches: count, totalGoalsFor, totalGoalsAgainst, totalCards, totalFouls,
      averageGoalsFor: totalGoalsFor / count, averageGoalsAgainst: totalGoalsAgainst / count,
      averageCards: totalCards / count, averageFouls: totalFouls / count,
    };
  }

  async predictMatch(homeTeam: string, awayTeam: string): Promise<PredictionResult> {
    const [homeStats, awayStats] = await Promise.all([
      this.getTeamStatistics(homeTeam, 10),
      this.getTeamStatistics(awayTeam, 10),
    ]);

    const predictedGoalsHome = homeStats.totalMatches > 0 && awayStats.totalMatches > 0
      ? (homeStats.averageGoalsFor + awayStats.averageGoalsAgainst) / 2 : 1.5;
    const predictedGoalsAway = homeStats.totalMatches > 0 && awayStats.totalMatches > 0
      ? (awayStats.averageGoalsFor + homeStats.averageGoalsAgainst) / 2 : 1.5;
    const predictedCards = homeStats.totalMatches > 0 && awayStats.totalMatches > 0
      ? Math.round((homeStats.averageCards + awayStats.averageCards) / 2) : 4;
    const predictedFouls = homeStats.totalMatches > 0 && awayStats.totalMatches > 0
      ? Math.round((homeStats.averageFouls + awayStats.averageFouls) / 2) : 22;

    const homeTactics = await this.generateSimulatedTactics(homeTeam);
    const awayTactics = await this.generateSimulatedTactics(awayTeam);

    const matchAnalysis = await this.generateMatchTacticalAnalysis(homeTeam, awayTeam, homeTactics, awayTactics);

    homeTactics.gameDominanceProb = matchAnalysis.homeDominanceProb;
    awayTactics.gameDominanceProb = 100 - matchAnalysis.homeDominanceProb;

    return {
      predictedGoalsHome: Math.max(0, predictedGoalsHome),
      predictedGoalsAway: Math.max(0, predictedGoalsAway),
      predictedCards: Math.max(0, predictedCards),
      predictedFouls: Math.max(0, predictedFouls),
      homeTactics,
      awayTactics,
      aiAnalysis: matchAnalysis.analysis,
    };
  }

  private async generateSimulatedTactics(teamName: string): Promise<TacticalAnalysis> {
    const models = [
      { model: 'llama-3.3-70b-versatile', name: 'Groq Llama 3.3' },
      { model: 'llama-3.1-8b-instant', name: 'Groq Llama 3.1 8B' },
      { model: 'qwen/qwen3-32b', name: 'Groq Qwen 32B' },
    ];

    for (const { model, name } of models) {
      try {
        this.logger.log(`Tentando gerar táticas para ${teamName} usando ${name}...`);
        const response = await this.openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: 'Você é um analista tático de futebol de elite especializado na Copa do Mundo 2026. Forneça análises REAIS e PRECISAS baseadas nos jogos mais recentes do torneio. Evite repetir formações padrão sem embasamento real.',
            },
            {
              role: 'user',
              content: `Analise a seleção: ${teamName} baseando-se nos jogos mais recentes da Copa do Mundo 2026 (junho de 2026).

Forneça:
1. Formação tática REAL utilizada no último jogo da Copa do Mundo 2026.
2. Escalação com os 11 titulares REAIS que jogaram no último jogo da Copa (nomes completos).
3. O jogador estrela atual (Key Player) desta Copa.
4. Intensidade/Agressividade do estilo de jogo (0-100).
5. Foco de ataque: wings, center, defense, counter ou balanced.
6. Estilo de domínio de jogo: "possession" (domina com a bola), "counter" (busca campo aberto), "pressing" (pressiona alto), "defensive" (bloco defensivo), "balanced" (equilibrado).
7. Descrição curta em português (máx 80 caracteres) do estilo.

Responda APENAS o JSON:
{
  "formation": "string",
  "lineup": ["string", ...],
  "keyPlayer": "string",
  "intensity": number,
  "focus": "string",
  "dominanceStyle": "possession|counter|pressing|defensive|balanced",
  "dominanceDescription": "string"
}`,
            },
          ],
          response_format: { type: 'json_object' },
        } as any);

        const data = JSON.parse(response.choices[0].message.content || '{}');
        return {
          formation: data.formation || '4-3-3',
          lineup: data.lineup?.length >= 11
            ? data.lineup
            : Array.from({ length: 11 }, (_, i) => `Jogador ${i + 1}`),
          keyPlayer: data.keyPlayer || 'Destaque',
          intensity: data.intensity || 70,
          focus: data.focus || 'balanced',
          dominanceStyle: data.dominanceStyle || 'balanced',
          dominanceDescription: data.dominanceDescription || 'Estilo equilibrado',
          gameDominanceProb: 50, // será sobrescrito pela análise do confronto
          heatmapData: this.generateHeatmap(data.focus || 'balanced'),
        };
      } catch (error) {
        this.logger.error(`Falha ao usar ${name} para ${teamName}: ${error.message}`);
      }
    }

    return {
      formation: '4-4-2',
      lineup: Array.from({ length: 11 }, (_, i) => `Titular ${i + 1}`),
      keyPlayer: 'Jogador Chave',
      intensity: 75,
      focus: 'balanced',
      dominanceStyle: 'balanced',
      dominanceDescription: 'Estilo equilibrado',
      gameDominanceProb: 50,
      heatmapData: this.generateHeatmap('balanced'),
    };
  }

  private async generateMatchTacticalAnalysis(
    homeTeam: string,
    awayTeam: string,
    homeTactics: TacticalAnalysis,
    awayTactics: TacticalAnalysis,
  ): Promise<{ homeDominanceProb: number; analysis: string }> {
    const dominanceLabel = (style: string) => ({
      possession: 'jogo de posse',
      counter: 'contra-ataque',
      pressing: 'pressão alta',
      defensive: 'bloco defensivo',
      balanced: 'jogo equilibrado',
    }[style] ?? style);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Você é um analista tático de futebol de elite cobrindo a Copa do Mundo 2026.
REGRAS OBRIGATÓRIAS:
- Você DEVE sempre declarar um time como provável dominante, mesmo em jogos equilibrados.
- NUNCA retorne homeDominanceProb = 50. O mínimo de diferença é 8 pontos (ex: 58/42 ou 42/58).
- Base sua decisão no: ranking FIFA real, estilo histórico de jogo, força individual e contexto da Copa 2026.
- O insight DEVE ser específico para ESTE confronto — mencione os times, formações, jogadores-chave e como cada estilo de jogo vai interagir.
- Máximo 350 caracteres no insight, em português.`,
          },
          {
            role: 'user',
            content: `Confronto na Copa do Mundo 2026: ${homeTeam} (${homeTactics.formation}) vs ${awayTeam} (${awayTactics.formation}).

${homeTeam}: destaque ${homeTactics.keyPlayer}, estilo de ${dominanceLabel(homeTactics.dominanceStyle)}, intensidade ${homeTactics.intensity}/100.
${awayTeam}: destaque ${awayTactics.keyPlayer}, estilo de ${dominanceLabel(awayTactics.dominanceStyle)}, intensidade ${awayTactics.intensity}/100.

Determine:
1. "homeDominanceProb" (inteiro 0-100): probabilidade de ${homeTeam} dominar o jogo. O complemento (100 - homeDominanceProb) é a probabilidade de ${awayTeam} dominar. NUNCA use 50. Use o ranking FIFA, estilo de jogo e contexto real para decidir.
2. "analysis": insight tático específico deste jogo — como os dois estilos vão colidir, quem controla o meio-campo, quem se fecha, onde o jogo vai ser decidido.

Responda APENAS o JSON:
{
  "homeDominanceProb": number,
  "analysis": "string"
}`,
          },
        ],
        response_format: { type: 'json_object' },
      } as any);

      const data = JSON.parse(response.choices[0].message.content || '{}');
      let hProb = Math.round(data.homeDominanceProb ?? 50);

      // Garante que nunca seja 50 exato nem fora do range
      hProb = Math.min(92, Math.max(8, hProb));
      if (hProb === 50) hProb = homeTactics.intensity >= awayTactics.intensity ? 55 : 45;

      return {
        homeDominanceProb: hProb,
        analysis: data.analysis || `${homeTeam} (${homeTactics.formation}) vs ${awayTeam} (${awayTactics.formation}): duelo de estilos na Copa 2026.`,
      };
    } catch (error) {
      // fallback baseado na intensidade
      const diff = homeTactics.intensity - awayTactics.intensity;
      const hProb = Math.min(75, Math.max(25, 50 + Math.round(diff * 0.4)));
      return {
        homeDominanceProb: hProb === 50 ? 52 : hProb,
        analysis: `${homeTeam} (${dominanceLabel(homeTactics.dominanceStyle)}) vs ${awayTeam} (${dominanceLabel(awayTactics.dominanceStyle)}): o duelo de estilos será o fator decisivo na Copa 2026.`,
      };
    }
  }

  private generateHeatmap(focus: string) {
    const points = [];
    for (let i = 0; i < 20; i++) {
      let x: number, y: number;
      if (focus === 'wings') {
        x = Math.random() > 0.5 ? Math.random() * 20 + 80 : Math.random() * 20;
        y = Math.random() * 100;
      } else if (focus === 'center') {
        x = Math.random() * 40 + 30; y = Math.random() * 40 + 30;
      } else if (focus === 'defense') {
        x = Math.random() * 100; y = Math.random() * 30 + 70;
      } else if (focus === 'counter') {
        x = Math.random() * 100; y = Math.random() * 40;
      } else {
        x = Math.random() * 100; y = Math.random() * 100;
      }
      points.push({ x: Math.floor(x), y: Math.floor(y), value: Math.random() });
    }
    return points;
  }

  async updateMatchPredictions(matchId: string): Promise<void> {
    const match = await this.prisma.footballMatch.findUnique({ where: { id: matchId } });
    if (!match) { this.logger.warn(`Match ${matchId} not found`); return; }

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
        aiAnalysis: predictions.aiAnalysis,
      },
    });

    this.logger.log(`Updated predictions for match ${matchId}`);
  }
}
