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

// ── Cadeia de modelos Groq gratuitos (cada um tem rate-limit independente) ──
// Ordem: mais capaz → mais rápido → fallback leve
// Models verified active on Groq as of June 2026
// Removed decommissioned: llama-3.1-70b-versatile, gemma2-9b-it, mixtral-8x7b-32768
const GROQ_TACTICS_MODELS = [
  { model: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B'  },
  { model: 'qwen/qwen3-32b',          name: 'Qwen 3 32B'     },
  { model: 'llama-3.1-8b-instant',    name: 'Llama 3.1 8B'   },
  { model: 'llama3-70b-8192',          name: 'Llama 3 70B'    },
  { model: 'llama3-8b-8192',           name: 'Llama 3 8B'     },
];

const GROQ_ANALYSIS_MODELS = [
  { model: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B'  },
  { model: 'qwen/qwen3-32b',          name: 'Qwen 3 32B'     },
  { model: 'llama3-70b-8192',          name: 'Llama 3 70B'    },
  { model: 'llama-3.1-8b-instant',    name: 'Llama 3.1 8B'   },
  { model: 'llama3-8b-8192',           name: 'Llama 3 8B'     },
];

function isRateLimitError(err: any): boolean {
  return err?.status === 429 || err?.message?.includes('rate') || err?.message?.includes('429');
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

  /** Tenta uma chamada em todos os modelos da cadeia até obter resposta válida */
  private async tryModels<T>(
    chain: typeof GROQ_TACTICS_MODELS,
    buildRequest: (model: string) => Parameters<typeof this.openai.chat.completions.create>[0],
    parse: (content: string) => T | null,
    label: string,
  ): Promise<T | null> {
    for (const { model, name } of chain) {
      try {
        this.logger.log(`[AI] tentando ${name} para ${label}...`);
        const res = await this.openai.chat.completions.create(buildRequest(model) as any);
        const content = res.choices[0]?.message?.content ?? '';
        const parsed = parse(content);
        if (parsed !== null) {
          this.logger.log(`[AI] ✅ ${name} respondeu para ${label}`);
          return parsed;
        }
        this.logger.warn(`[AI] ${name} retornou JSON inválido — próximo modelo`);
      } catch (err: any) {
        const reason = isRateLimitError(err) ? 'rate-limit' : err.message;
        this.logger.warn(`[AI] ${name} falhou (${reason}) — próximo modelo`);
      }
    }
    return null;
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

    // goalScenarios, probabilidades e duelos são match-level: armazenados em homeTactics como campos extras no JSON
    (homeTactics as any).goalScenarios = matchAnalysis.goalScenarios;
    (homeTactics as any).winProbHome   = matchAnalysis.winProbHome;
    (homeTactics as any).drawProb      = matchAnalysis.drawProb;
    (homeTactics as any).winProbAway   = matchAnalysis.winProbAway;
    (homeTactics as any).keyDuels      = matchAnalysis.keyDuels;

    return {
      predictedGoalsHome: parseFloat(predictedGoalsHome.toFixed(1)),
      predictedGoalsAway: parseFloat(predictedGoalsAway.toFixed(1)),
      predictedCards,
      predictedFouls,
      homeTactics,
      awayTactics,
      aiAnalysis: matchAnalysis.analysis,
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

    const prompt = hasRealLineup
      ? `A seleção ${teamName} disputou seu último jogo na Copa do Mundo 2026 com ESTA escalação real (obtida via scraping — use EXATAMENTE esses nomes, sem inventar outros):
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
      : `Analise a seleção ${teamName} nos jogos mais recentes da Copa do Mundo 2026 (junho de 2026).

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

    const systemMsg = 'Você é um analista tático de futebol de elite especializado na Copa do Mundo 2026. ' +
      (hasRealLineup
        ? 'A escalação já foi fornecida via scraping — use EXATAMENTE esses nomes, apenas analise táticas e estilo.'
        : 'Forneça análises REAIS baseadas nos jogos mais recentes. Evite repetir formações padrão sem embasamento.');

    const data = await this.tryModels(
      GROQ_TACTICS_MODELS,
      (model) => ({
        model,
        messages: [
          { role: 'system' as const, content: systemMsg },
          { role: 'user'   as const, content: prompt },
        ],
        response_format: { type: 'json_object' as const },
      }),
      (content) => {
        try {
          const parsed = JSON.parse(content || '{}');
          if (!parsed.formation) return null;
          return parsed;
        } catch { return null; }
      },
      `táticas-${teamName}`,
    );

    const finalLineup = hasRealLineup
      ? scrapedLineup.slice(0, 11)
      : (data?.lineup?.length >= 11 ? data.lineup : Array.from({ length: 11 }, (_, i) => `Jogador ${i + 1}`));

    if (data) {
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
    }

    // Fallback total — nenhum modelo respondeu
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
    goalScenarios: string[];
    winProbHome: number;
    drawProb: number;
    winProbAway: number;
    keyDuels: { homePlayer: string; awayPlayer: string; context: string; advantage: 'home' | 'away' | 'equal' }[];
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
      // Probabilidades de resultado baseadas no dominanceProb
      const wph = hProb === 50 ? 52 : hProb;
      const winHome = Math.round(wph * 0.85);
      const winAway = Math.round((100 - wph) * 0.85);
      const draw = 100 - winHome - winAway;
      return {
        homeDominanceProb: wph,
        homeStyle: hs, homeDesc: descMap[hs],
        awayStyle: as, awayDesc: descMap[as],
        analysis: `${homeTeam} x ${awayTeam}: duelo tático equilibrado na Copa 2026.`,
        goalScenarios: [
          `Cruzamentos pela lateral explorando os espaços deixados pelo adversário`,
          `Bolas paradas e escanteios disputados na área`,
          `Transição rápida com finalização antes da defesa se reorganizar`,
        ],
        winProbHome: winHome,
        drawProb: draw,
        winProbAway: winAway,
        keyDuels: [
          { homePlayer: homeTactics.keyPlayer, awayPlayer: awayTactics.keyPlayer, context: 'Duelo de estrelas no meio-campo', advantage: wph > 55 ? 'home' : wph < 45 ? 'away' : 'equal' },
        ],
      };
    };

    const analysisSystemMsg = `Você é um analista tático de futebol de elite cobrindo a Copa do Mundo 2026.
REGRAS ABSOLUTAS:
1. "homeDominanceProb": NUNCA use 50. Diferença mínima de 8 pontos. Base: ranking FIFA, histórico, Copa 2026.
2. "homeStyle" e "awayStyle": OBRIGATORIAMENTE diferentes entre si. PROIBIDO usar "balanced". Estilos válidos APENAS: "possession", "counter", "pressing", "defensive".
3. "homeDesc" e "awayDesc": descrição em português de até 60 caracteres, específica para ESTE confronto.
4. "analysis": resumo tático rico, específico, NÃO GENÉRICO — mencione os jogadores-chave, como as formações se encaixam e o ponto crítico do jogo. Mínimo 300 caracteres, máximo 600 caracteres.
5. "goalScenarios": array com exatamente 4 formas ESPECÍFICAS e DISTINTAS de gol poderem sair neste jogo. Varie entre: cabeçada em cruzamento, chute de fora da área, lateral, jogada individual, falta/escanteio, contra-ataque, pênalti. Cada item deve ser uma frase descritiva (20-80 chars), não apenas um rótulo.
6. "winProbHome", "drawProb", "winProbAway": probabilidades de resultado em números inteiros que DEVEM somar exatamente 100. Baseie-se no ranking FIFA, forma recente e histórico de confrontos.
7. "keyDuels": exatamente 3 duelos-chave específicos deste jogo — um por setor (ataque/defesa, meio-campo, corredores). Cada duelo deve ter nomes REAIS dos jogadores, contexto específico e quem tem vantagem ("home", "away" ou "equal").`;

    const analysisUserMsg = `Copa do Mundo 2026: ${homeTeam} (${homeTactics.formation}, destaque: ${homeTactics.keyPlayer}, xG médio: ${homeXG || 'N/A'}) vs ${awayTeam} (${awayTactics.formation}, destaque: ${awayTactics.keyPlayer}, xG médio: ${awayXG || 'N/A'}).

Analise o confronto tático real deste jogo. Descreva como os estilos se chocam com base nas formações e características conhecidas de cada seleção. O texto deve ser direto, preciso e revelar algo que não é óbvio — como um duelo específico de corredor, uma zona de pressão crítica, ou uma vulnerabilidade defensiva que pode ser explorada.

Responda APENAS este JSON:
{
  "homeDominanceProb": number,
  "homeStyle": "possession|counter|pressing|defensive",
  "homeDesc": "string (até 60 chars)",
  "awayStyle": "possession|counter|pressing|defensive",
  "awayDesc": "string (até 60 chars)",
  "analysis": "string (300-600 chars) — resumo tático específico, rico, NÃO genérico",
  "goalScenarios": ["string", "string", "string", "string"],
  "winProbHome": number,
  "drawProb": number,
  "winProbAway": number,
  "keyDuels": [
    {"homePlayer": "string", "awayPlayer": "string", "context": "string (até 80 chars)", "advantage": "home|away|equal"},
    {"homePlayer": "string", "awayPlayer": "string", "context": "string (até 80 chars)", "advantage": "home|away|equal"},
    {"homePlayer": "string", "awayPlayer": "string", "context": "string (até 80 chars)", "advantage": "home|away|equal"}
  ]
}`;

    const rawData = await this.tryModels(
      GROQ_ANALYSIS_MODELS,
      (model) => ({
        model,
        messages: [
          { role: 'system' as const, content: analysisSystemMsg },
          { role: 'user'   as const, content: analysisUserMsg },
        ],
        response_format: { type: 'json_object' as const },
      }),
      (content) => {
        try {
          const parsed = JSON.parse(content || '{}');
          if (typeof parsed.homeDominanceProb !== 'number') return null;
          return parsed;
        } catch { return null; }
      },
      `análise-${homeTeam}-vs-${awayTeam}`,
    );

    if (!rawData) return fallbackPair();

    try {
      const data = rawData;

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

      // Valida goalScenarios — garante array de strings
      const rawScenarios = Array.isArray(data.goalScenarios) ? data.goalScenarios : [];
      const goalScenarios: string[] = rawScenarios
        .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
        .slice(0, 5);

      // Se a IA não gerou, usa fallback baseado nos estilos
      if (goalScenarios.length === 0) {
        goalScenarios.push(...this.fallbackGoalScenarios(homeTeam, awayTeam, homeStyle, awayStyle));
      }

      // Probabilidades de resultado — garante soma = 100
      let winHome = typeof data.winProbHome === 'number' ? Math.round(data.winProbHome) : Math.round(hProb * 0.85);
      let winAway = typeof data.winProbAway === 'number' ? Math.round(data.winProbAway) : Math.round((100 - hProb) * 0.85);
      let drawP   = typeof data.drawProb    === 'number' ? Math.round(data.drawProb)    : 100 - winHome - winAway;
      // Ajusta para somar exatamente 100
      const sumProb = winHome + drawP + winAway;
      if (sumProb !== 100) { drawP += (100 - sumProb); }
      drawP = Math.max(3, drawP);
      winHome = Math.max(5, winHome);
      winAway = Math.max(5, winAway);
      const total = winHome + drawP + winAway;
      if (total !== 100) { winHome = 100 - drawP - winAway; }

      // Duelos-chave — valida estrutura
      const rawDuels = Array.isArray(data.keyDuels) ? data.keyDuels : [];
      const keyDuels = rawDuels
        .filter((d: any) => d?.homePlayer && d?.awayPlayer && d?.context)
        .slice(0, 4)
        .map((d: any) => ({
          homePlayer: String(d.homePlayer),
          awayPlayer: String(d.awayPlayer),
          context: String(d.context),
          advantage: (['home', 'away', 'equal'].includes(d.advantage) ? d.advantage : 'equal') as 'home' | 'away' | 'equal',
        }));

      // Fallback se a IA não gerou duelos
      if (keyDuels.length === 0) {
        keyDuels.push({
          homePlayer: homeTactics.keyPlayer,
          awayPlayer: awayTactics.keyPlayer,
          context: 'Disputa pelos espaços no meio-campo',
          advantage: hProb > 55 ? 'home' : hProb < 45 ? 'away' : 'equal',
        });
      }

      return {
        homeDominanceProb: hProb,
        homeStyle: homeStyle as TacticalAnalysis['dominanceStyle'],
        homeDesc: data.homeDesc || this.defaultDesc(homeStyle),
        awayStyle: awayStyle as TacticalAnalysis['dominanceStyle'],
        awayDesc: data.awayDesc || this.defaultDesc(awayStyle),
        analysis: data.analysis || `${homeTeam} vs ${awayTeam}: estilos contrastantes na Copa 2026.`,
        goalScenarios,
        winProbHome: winHome,
        drawProb: drawP,
        winProbAway: winAway,
        keyDuels,
      };
    } catch {
      return fallbackPair();
    }
  }

  private fallbackGoalScenarios(
    homeTeam: string,
    awayTeam: string,
    homeStyle: string,
    awayStyle: string,
  ): string[] {
    const scenarios: Record<string, string[]> = {
      possession: [
        `${homeTeam} troca passes até abrir espaço e finaliza de dentro da área`,
        `Cruzamento pela esquerda e cabeçada do centroavante`,
      ],
      counter: [
        `${awayTeam} rouba a bola no meio e avança em velocidade para o gol`,
        `Passe em profundidade nas costas da defesa alta`,
      ],
      pressing: [
        `Pressing alto força erro do goleiro ou defensor no campo adversário`,
        `Segunda bola após pressão vira finalização de fora da área`,
      ],
      defensive: [
        `Bola parada — escanteio ou falta lateral batida na área`,
        `Contra-ataque rápido com dois toques após roubo de bola`,
      ],
    };

    return [
      ...(scenarios[homeStyle] ?? []),
      ...(scenarios[awayStyle] ?? []),
      `Chute de fora da área surpreende o goleiro desposicionado`,
    ].slice(0, 4);
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
