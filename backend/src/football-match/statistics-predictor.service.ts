import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScraperService } from './scraper.service';
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
  dominanceStyle: 'possession' | 'counter' | 'pressing' | 'defensive';
  dominanceDescription: string;
  gameDominanceProb: number;
  heatmapData: { x: number; y: number; value: number }[];
  expectedGoals?: number;
  advancedStats?: {
    passesProgressive: number;
    pressingEfficiency: number;
    deepCompletions: number;
  };
}

interface PredictionResult {
  predictedGoalsHome: number;
  predictedGoalsAway: number;
  predictedCards: number;
  predictedFouls: number;
  homeTactics?: TacticalAnalysis;
  awayTactics?: TacticalAnalysis;
  aiAnalysis: string;
  // shortInsight: string;
  // attentionPoint: string;
}

@Injectable()
export class StatisticsPredictorService {
  private readonly logger = new Logger(StatisticsPredictorService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraper: ScraperService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }

  async getTeamStatistics(teamName: string, limit = 10): Promise<TeamStatistics> {
    const matches = await this.prisma.footballMatch.findMany({
      where: {
        status: 'FT',
        OR: [{ homeTeam: teamName }, { awayTeam: teamName }],
      },
      orderBy: { date: 'desc' },
      take: limit,
    });

    if (!matches.length) {
      return {
        totalMatches: 0, totalGoalsFor: 0, totalGoalsAgainst: 0,
        totalCards: 0, totalFouls: 0, averageGoalsFor: 0,
        averageGoalsAgainst: 0, averageCards: 0, averageFouls: 0,
      };
    }

    let totalGoalsFor = 0, totalGoalsAgainst = 0, totalCards = 0, totalFouls = 0;
    for (const m of matches) {
      const isHome = m.homeTeam === teamName;
      totalGoalsFor     += isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
      totalGoalsAgainst += isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
      totalCards  += m.predictedCards ?? 0;
      totalFouls  += m.predictedFouls ?? 0;
    }

    const count = matches.length;
    return {
      totalMatches: count, totalGoalsFor, totalGoalsAgainst, totalCards, totalFouls,
      averageGoalsFor: totalGoalsFor / count, averageGoalsAgainst: totalGoalsAgainst / count,
      averageCards: totalCards / count, averageFouls: totalFouls / count,
    };
  }

  async predictMatch(homeTeam: string, awayTeam: string): Promise<PredictionResult> {
    const [homeStats, awayStats, homeAdv, awayAdv] = await Promise.all([
      this.getTeamStatistics(homeTeam, 10),
      this.getTeamStatistics(awayTeam, 10),
      this.scraper.scrapeAdvancedStats(homeTeam),
      this.scraper.scrapeAdvancedStats(awayTeam),
    ]);

    const homeXG = homeAdv.expectedGoals;
    const awayXG = awayAdv.expectedGoals;

    // Lógica de predição melhorada: usa xG como base se não houver histórico de gols
    const baseGoalsHome = homeXG || 1.4;
    const baseGoalsAway = awayXG || 1.2;

    const homeSeed = homeTeam.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const awaySeed = awayTeam.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const matchSeed = homeSeed + awaySeed;

    const predictedGoalsHome = homeStats.totalMatches > 0 && awayStats.totalMatches > 0
      ? (homeStats.averageGoalsFor + awayStats.averageGoalsAgainst) / 2 
      : baseGoalsHome + ((matchSeed % 7) / 10);
    const predictedGoalsAway = homeStats.totalMatches > 0 && awayStats.totalMatches > 0
      ? (awayStats.averageGoalsFor + homeStats.averageGoalsAgainst) / 2 
      : baseGoalsAway + ((matchSeed % 5) / 10);
    
    const predictedCards = homeStats.totalMatches > 0 && awayStats.totalMatches > 0
      ? Math.round((homeStats.averageCards + awayStats.averageCards) / 2) 
      : 3 + (matchSeed % 4);
    const predictedFouls = homeStats.totalMatches > 0 && awayStats.totalMatches > 0
      ? Math.round((homeStats.averageFouls + awayStats.averageFouls) / 2) 
      : 16 + (matchSeed % 12);

    const [homeTactics, awayTactics] = await Promise.all([
      this.generateSimulatedTactics(homeTeam),
      this.generateSimulatedTactics(awayTeam),
    ]);

    // Injeta xG e dados avançados (StatsBomb) nas táticas para exibição e análise
    homeTactics.expectedGoals = homeXG;
    homeTactics.advancedStats = {
      passesProgressive: homeAdv.passesProgressive,
      pressingEfficiency: homeAdv.pressingEfficiency,
      deepCompletions: homeAdv.deepCompletions,
    };

    awayTactics.expectedGoals = awayXG;
    awayTactics.advancedStats = {
      passesProgressive: awayAdv.passesProgressive,
      pressingEfficiency: awayAdv.pressingEfficiency,
      deepCompletions: awayAdv.deepCompletions,
    };

    const matchAnalysis = await this.generateMatchTacticalAnalysis(homeTeam, awayTeam, homeTactics, awayTactics, homeXG, awayXG);

    // Domínio — quem manda no jogo
    homeTactics.gameDominanceProb = matchAnalysis.homeDominanceProb;
    awayTactics.gameDominanceProb = 100 - matchAnalysis.homeDominanceProb;

    // Estilos contrastantes definidos no contexto do confronto — sobrescreve o valor individual
    homeTactics.dominanceStyle = matchAnalysis.homeStyle;
    homeTactics.dominanceDescription = matchAnalysis.homeDesc;
    homeTactics.heatmapData = this.generateHeatmap(matchAnalysis.homeStyle);

    awayTactics.dominanceStyle = matchAnalysis.awayStyle;
    awayTactics.dominanceDescription = matchAnalysis.awayDesc;
    awayTactics.heatmapData = this.generateHeatmap(matchAnalysis.awayStyle);

    return {
      predictedGoalsHome: parseFloat(predictedGoalsHome.toFixed(1)),
      predictedGoalsAway: parseFloat(predictedGoalsAway.toFixed(1)),
      predictedCards,
      predictedFouls,
      homeTactics,
      awayTactics,
      aiAnalysis: matchAnalysis.analysis,
      // shortInsight: matchAnalysis.shortInsight,
      // attentionPoint: matchAnalysis.shortInsight ?? 'Fique de olho nesse confronto',
    } as any;
  }

  private async generateSimulatedTactics(teamName: string): Promise<TacticalAnalysis> {
    // 1. Tenta obter escalação real via scraping
    let scrapedLineup: string[] = [];
    try {
      scrapedLineup = await this.scraper.scrapeLineup(teamName);
      if (scrapedLineup.length >= 11) {
        this.logger.log(`[predictor] escalação real obtida para ${teamName} (${scrapedLineup.length} jogadores)`);
      }
    } catch (err: any) {
      this.logger.warn(`[predictor] scraping falhou para ${teamName}: ${err.message}`);
    }

    const hasRealLineup = scrapedLineup.length >= 11;

    const models = [
      { model: 'llama-3.3-70b-versatile', name: 'Groq Llama 3.3' },
      { model: 'llama-3.1-8b-instant',    name: 'Groq Llama 3.1 8B' },
      { model: 'qwen/qwen3-32b',           name: 'Groq Qwen 32B' },
    ];

    for (const { model, name } of models) {
      try {
        this.logger.log(`Gerando táticas para ${teamName} com ${name}...`);

        const prompt = hasRealLineup
          ? // ── Modo com escalação real ─────────────────────────────────────
            `A seleção ${teamName} disputou seu último jogo na Copa do Mundo 2026 com ESTA escalação real (obtida via scraping — use EXATAMENTE esses nomes, sem inventar outros):
${scrapedLineup.slice(0, 11).join(', ')}

Com base nessa escalação, determine:
1. Formação tática mais provável (ex: 4-3-3, 4-4-2, 3-5-2 etc.)
2. O jogador estrela atual desta Copa (Key Player) — deve ser um dos nomes acima.
3. Intensidade/Agressividade do estilo de jogo (0-100).
4. Foco de ataque: wings, center, defense, counter ou balanced.
5. Estilo de domínio: APENAS "possession", "counter", "pressing" ou "defensive" — NUNCA "balanced".
6. Descrição curta em português (máx 80 chars) do estilo.

Responda APENAS o JSON (coloque os 11 jogadores na ordem do campo, começando pelo goleiro):
{
  "formation": "string",
  "lineup": ${JSON.stringify(scrapedLineup.slice(0, 11))},
  "keyPlayer": "string",
  "intensity": number,
  "focus": "string",
  "dominanceStyle": "possession|counter|pressing|defensive",
  "dominanceDescription": "string"
}`
          : // ── Modo sem escalação real — IA gera tudo ──────────────────────
            `Analise a seleção ${teamName} nos jogos mais recentes da Copa do Mundo 2026 (junho de 2026).

Forneça:
1. Formação tática REAL utilizada no último jogo.
2. Escalação com os 11 titulares REAIS (nomes completos).
3. O jogador estrela atual (Key Player) desta Copa.
4. Intensidade/Agressividade (0-100).
5. Foco de ataque: wings, center, defense ou counter.
6. Estilo de domínio: APENAS "possession", "counter", "pressing" ou "defensive" — NUNCA "balanced".
7. Descrição curta em português (máx 80 chars) do estilo.

Responda APENAS o JSON:
{
  "formation": "string",
  "lineup": ["string", ...11 nomes],
  "keyPlayer": "string",
  "intensity": number,
  "focus": "string",
  "dominanceStyle": "possession|counter|pressing|defensive",
  "dominanceDescription": "string"
}`;

        const response = await this.openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: 'Você é um analista tático de futebol de elite especializado na Copa do Mundo 2026. ' +
                (hasRealLineup
                  ? 'A escalação já foi fornecida via scraping — use EXATAMENTE esses nomes, apenas analise táticas e estilo.'
                  : 'Forneça análises REAIS baseadas nos jogos mais recentes. Evite repetir formações padrão sem embasamento.'),
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
        } as any);

        const data = JSON.parse(response.choices[0].message.content || '{}');

        // Se temos escalação real do scraping, garante que ela seja usada
        const finalLineup = hasRealLineup
          ? scrapedLineup.slice(0, 11)
          : (data.lineup?.length >= 11 ? data.lineup : Array.from({ length: 11 }, (_, i) => `Jogador ${i + 1}`));

        return {
          formation: data.formation || '4-3-3',
          lineup: finalLineup,
          keyPlayer: data.keyPlayer || finalLineup[0] || 'Destaque',
          intensity: data.intensity || 70,
          focus: data.focus || 'balanced',
          dominanceStyle: data.dominanceStyle || 'pressing',
          dominanceDescription: data.dominanceDescription || 'Estilo agressivo e determinado',
          gameDominanceProb: 50,
          heatmapData: this.generateHeatmap(data.focus || 'counter'),
        };
      } catch (error: any) {
        this.logger.error(`Falha ao usar ${name} para ${teamName}: ${error.message}`);
      }
    }

    // Fallback total
    const fallbackLineup = hasRealLineup
      ? scrapedLineup.slice(0, 11)
      : Array.from({ length: 11 }, (_, i) => `Titular ${i + 1}`);

    return {
      formation: '4-4-2',
      lineup: fallbackLineup,
      keyPlayer: fallbackLineup[0] || 'Jogador Chave',
      intensity: 75,
      focus: 'counter',
      dominanceStyle: 'pressing',
      dominanceDescription: 'Pressão alta e determinação',
      gameDominanceProb: 50,
      heatmapData: this.generateHeatmap('counter'),
    };
  }

  private async generateMatchTacticalAnalysis(
    homeTeam: string,
    awayTeam: string,
    homeTactics: TacticalAnalysis,
    awayTactics: TacticalAnalysis,
    homeXG?: number,
    awayXG?: number,
  ): Promise<{
    homeDominanceProb: number;
    homeStyle: TacticalAnalysis['dominanceStyle'];
    homeDesc: string;
    awayStyle: TacticalAnalysis['dominanceStyle'];
    awayDesc: string;
    analysis: string;
  }> {
    // Pares de estilos contrastantes válidos — nunca iguais, nunca ambos "balanced"
    const CONTRAST_PAIRS: Array<[TacticalAnalysis['dominanceStyle'], TacticalAnalysis['dominanceStyle']]> = [
      ['possession', 'defensive'],
      ['possession', 'counter'],
      ['pressing',   'counter'],
      ['pressing',   'defensive'],
      ['possession', 'pressing'],
      ['counter',    'defensive'],
    ];

    // Fallback determinístico: escolhe par baseado na intensidade relativa
    const fallbackPair = (): ReturnType<typeof this.generateMatchTacticalAnalysis> extends Promise<infer T> ? T : never => {
      const diff = homeTactics.intensity - awayTactics.intensity;
      const hProb = Math.min(75, Math.max(25, 50 + Math.round(diff * 0.4)));
      const idx = Math.abs(Math.round(homeTactics.intensity + awayTactics.intensity)) % CONTRAST_PAIRS.length;
      const [hs, as] = homeTactics.intensity >= awayTactics.intensity
        ? CONTRAST_PAIRS[idx]
        : [CONTRAST_PAIRS[idx][1], CONTRAST_PAIRS[idx][0]];
      const descMap: Record<string, string> = {
        possession: 'Controla o jogo com a posse', counter: 'Explora espaços no contra-ataque',
        pressing: 'Pressiona alto e sufoca o adversário', defensive: 'Bloco defensivo organizado',
      };
      return {
        homeDominanceProb: hProb === 50 ? 52 : hProb,
        homeStyle: hs, homeDesc: descMap[hs],
        awayStyle: as, awayDesc: descMap[as],
        analysis: `${homeTeam} x ${awayTeam}: duelo tático equilibrado na Copa 2026.`,
      };
    };

    try {
      const response = await this.openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Você é um analista tático de futebol de elite cobrindo a Copa do Mundo 2026.
REGRAS ABSOLUTAS:
1. "homeDominanceProb": NUNCA use 50. Diferença mínima de 8 pontos. Base: ranking FIFA, histórico, Copa 2026.
2. "homeStyle" e "awayStyle": OBRIGATORIAMENTE diferentes entre si. PROIBIDO usar "balanced" em qualquer um dos dois. Escolha estilos que reflitam o confronto real — ex: um time joga posse, o outro contra-ataque; um pressiona, o outro se fecha.
3. Estilos válidos APENAS: "possession", "counter", "pressing", "defensive". NUNCA "balanced".
4. "homeDesc" e "awayDesc": descrição em português de até 60 caracteres explicando o estilo daquele time NESTE confronto específico.
5. "analysis": insight de até 350 caracteres mencionando times, formações e como os estilos se opõem.`,
          },
          {
            role: 'user',
            content: `Copa do Mundo 2026: ${homeTeam} (${homeTactics.formation}, destaque: ${homeTactics.keyPlayer}, intensidade ${homeTactics.intensity}/100, xG médio: ${homeXG || 'N/A'}, passes progressivos: ${homeTactics.advancedStats?.passesProgressive}, eficiência de pressão: ${homeTactics.advancedStats?.pressingEfficiency}%, deep completions: ${homeTactics.advancedStats?.deepCompletions}) vs ${awayTeam} (${awayTactics.formation}, destaque: ${awayTactics.keyPlayer}, intensidade ${awayTactics.intensity}/100, xG médio: ${awayXG || 'N/A'}, passes progressivos: ${awayTactics.advancedStats?.passesProgressive}, eficiência de pressão: ${awayTactics.advancedStats?.pressingEfficiency}%, deep completions: ${awayTactics.advancedStats?.deepCompletions}).

Analise o confronto tático, considerando os estilos de jogo, formações, jogadores-chave e as métricas avançadas (xG, passes progressivos, eficiência de pressão, deep completions). Descreva como os estilos se chocam e quais times podem ter vantagem. Inclua um "Ponto de Atenção" que destaque um duelo individual ou uma área crítica do campo. A análise deve ser detalhada, com no mínimo 200 caracteres e no máximo 500 caracteres.

Responda APENAS este JSON:
{
  "homeDominanceProb": number,
  "homeStyle": "possession|counter|pressing|defensive",
  "homeDesc": "string (até 60 chars)",
  "awayStyle": "possession|counter|pressing|defensive",
  "awayDesc": "string (até 60 chars)",
  "analysis": "string (200-500 chars) - Análise tática detalhada, citando métricas avançadas e como os estilos se chocam."
}`,
          },
        ],
        response_format: { type: 'json_object' },
      } as any);

      const data = JSON.parse(response.choices[0].message.content || '{}');

      const validStyles = new Set(['possession', 'counter', 'pressing', 'defensive']);
      let homeStyle = validStyles.has(data.homeStyle) ? data.homeStyle : null;
      let awayStyle = validStyles.has(data.awayStyle) ? data.awayStyle : null;

      // Garante estilos diferentes e taticamente opostos
      [homeStyle, awayStyle] = this.enforceContrastingStyles(
        homeStyle as TacticalAnalysis['dominanceStyle'] | null,
        awayStyle as TacticalAnalysis['dominanceStyle'] | null,
        homeTactics.intensity,
        awayTactics.intensity,
      );

      let hProb = Math.min(92, Math.max(8, Math.round(data.homeDominanceProb ?? 50)));
      if (Math.abs(hProb - 50) < 5) hProb = homeTactics.intensity >= awayTactics.intensity ? 57 : 43;

      return {
        homeDominanceProb: hProb,
        homeStyle: homeStyle as TacticalAnalysis['dominanceStyle'],
        homeDesc: data.homeDesc || this.defaultDesc(homeStyle),
        awayStyle: awayStyle as TacticalAnalysis['dominanceStyle'],
        awayDesc: data.awayDesc || this.defaultDesc(awayStyle),
        analysis: data.analysis || `${homeTeam} vs ${awayTeam}: estilos contrastantes na Copa 2026.`,
      };
    } catch {
      return fallbackPair();
    }
  }

  /**
   * Garante que os dois times tenham estilos OBRIGATORIAMENTE diferentes e taticamente opostos.
   * Se a IA enviou estilos iguais ou inválidos, aplica resposta natural (pressing → counter, etc.)
   */
  private enforceContrastingStyles(
    home: TacticalAnalysis['dominanceStyle'] | null,
    away: TacticalAnalysis['dominanceStyle'] | null,
    homeIntensity: number,
    awayIntensity: number,
  ): [TacticalAnalysis['dominanceStyle'], TacticalAnalysis['dominanceStyle']] {
    // Resposta tática natural: dado o estilo do time A, o time B naturalmente joga assim
    const NATURAL_RESPONSE: Record<string, TacticalAnalysis['dominanceStyle']> = {
      pressing:   'counter',    // contra pressão alta → contra-ataque
      possession: 'defensive',  // contra posse → bloco defensivo
      counter:    'possession', // contra contra-ataque → controlar a posse
      defensive:  'pressing',   // contra bloco fechado → pressionar para abrir
    };

    // Se apenas um veio da IA, calcula o outro como resposta natural
    if (home && !away) return [home, NATURAL_RESPONSE[home]];
    if (!home && away) return [NATURAL_RESPONSE[away] ?? 'possession', away];

    // Se ambos vieram e são iguais, força a resposta natural para o away
    if (home && away && home === away) {
      return [home, NATURAL_RESPONSE[home]];
    }

    // Se ambos são válidos e diferentes, aceita como está
    if (home && away && home !== away) return [home, away];

    // Fallback determinístico baseado na intensidade relativa dos times
    const FALLBACK_PAIRS: Array<[TacticalAnalysis['dominanceStyle'], TacticalAnalysis['dominanceStyle']]> = [
      ['pressing',   'counter'],
      ['possession', 'defensive'],
      ['possession', 'counter'],
      ['pressing',   'defensive'],
      ['counter',    'defensive'],
      ['possession', 'pressing'],
    ];
    const idx = Math.abs(Math.round(homeIntensity + awayIntensity)) % FALLBACK_PAIRS.length;
    return homeIntensity >= awayIntensity
      ? FALLBACK_PAIRS[idx]
      : [FALLBACK_PAIRS[idx][1], FALLBACK_PAIRS[idx][0]];
  }

  private defaultDesc(style: string | null): string {
    const map: Record<string, string> = {
      pressing:   'Pressão alta e sufoca o adversário',
      counter:    'Explora espaços no contra-ataque',
      possession: 'Controla o jogo com a posse',
      defensive:  'Bloco defensivo bem organizado',
    };
    return map[style ?? 'pressing'] ?? 'Pressão alta e determinação';
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
        predictedCards:     predictions.predictedCards,
        predictedFouls:     predictions.predictedFouls,
        homeTactics:        predictions.homeTactics as any,
        awayTactics:        predictions.awayTactics as any,
        aiAnalysis:         predictions.aiAnalysis,
      },
    });
    this.logger.log(`Updated predictions for match ${matchId}`);
  }
}
