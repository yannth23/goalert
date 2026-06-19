import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ScraperService } from './scraper.service';
import { StatisticsPredictorService } from './statistics-predictor.service';
import OpenAI from 'openai';
import axios from 'axios';

interface TeamReport {
  teamName: string;
  lastUpdated: string;
  profile: {
    formation: string;
    keyPlayer: string;
    intensity: number;
    dominanceStyle: 'possession' | 'counter' | 'pressing' | 'defensive';
    description: string;
  };
  statistics: {
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    averageGoalsPerMatch: number;
    averageXG: number;
  };
  recentMatches: Array<{
    date: string;
    opponent: string;
    result: string;
    score: string;
    tactics: string;
  }>;
  webInsights: {
    recentNews: string[];
    pressAnalysis: string;
    teamSentiment: string;
  };
  aiAnalysis: string;
}

const CACHE_TTL_SECONDS = 3600; // 1 hora

@Injectable()
export class TeamReportService {
  private readonly logger = new Logger(TeamReportService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly scraper: ScraperService,
    private readonly predictor: StatisticsPredictorService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }

  async getTeamReport(teamName: string): Promise<TeamReport> {
    const cacheKey = `team-report:${teamName.toLowerCase().replace(/\s+/g, '-')}`;

    // Tenta cache primeiro
    try {
      const cached = await this.redis.getJson<TeamReport>(cacheKey);
      if (cached) {
        this.logger.log(`[team-report] cache hit para ${teamName}`);
        return cached;
      }
    } catch {}

    try {
      this.logger.log(`[team-report] gerando relatório para ${teamName}...`);

      const [profile, statistics, recentMatches, webInsights, aiAnalysis] = await Promise.all([
        this.generateTeamProfile(teamName),
        this.getTeamStatistics(teamName),
        this.getRecentMatches(teamName),
        this.fetchWebInsights(teamName),
        this.generateAIAnalysis(teamName),
      ]);

      const report: TeamReport = {
        teamName,
        lastUpdated: new Date().toISOString(),
        profile,
        statistics,
        recentMatches,
        webInsights,
        aiAnalysis,
      };

      // Cacheia o resultado
      await this.redis.setJson(cacheKey, report, CACHE_TTL_SECONDS).catch(() => {});

      return report;
    } catch (error: any) {
      this.logger.error(`Erro ao gerar relatório para ${teamName}: ${error.message}`);
      throw error;
    }
  }

  private async generateTeamProfile(teamName: string) {
    try {
      // Tenta obter escalação real
      const lineup = await this.scraper.scrapeLineup(teamName);

      const prompt = lineup.length >= 11
        ? `Analise a seleção ${teamName} com base nesta escalação real (últimos 11 titulares):
${lineup.slice(0, 11).join(', ')}

Determine:
1. Formação tática
2. Jogador estrela
3. Intensidade (0-100)
4. Estilo de domínio: "possession", "counter", "pressing" ou "defensive"
5. Descrição curta em português (máx 80 chars)

Responda APENAS o JSON:
{
  "formation": "string",
  "keyPlayer": "string",
  "intensity": number,
  "dominanceStyle": "possession|counter|pressing|defensive",
  "description": "string"
}`
        : `Analise a seleção ${teamName} nos últimos jogos da Copa do Mundo 2026.

Forneça:
1. Formação tática predominante
2. Jogador estrela
3. Intensidade (0-100)
4. Estilo de domínio: "possession", "counter", "pressing" ou "defensive"
5. Descrição curta em português (máx 80 chars)

Responda APENAS o JSON:
{
  "formation": "string",
  "keyPlayer": "string",
  "intensity": number,
  "dominanceStyle": "possession|counter|pressing|defensive",
  "description": "string"
}`;

      const response = await this.openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Você é um analista tático de futebol especializado na Copa do Mundo 2026.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      } as any);

      const data = JSON.parse(response.choices[0].message.content || '{}');

      return {
        formation: data.formation || '4-3-3',
        keyPlayer: data.keyPlayer || 'Destaque',
        intensity: data.intensity || 70,
        dominanceStyle: data.dominanceStyle || 'pressing',
        description: data.description || 'Estilo tático equilibrado',
      };
    } catch (error: any) {
      this.logger.warn(`Erro ao gerar perfil para ${teamName}: ${error.message}`);
      return {
        formation: '4-3-3',
        keyPlayer: 'Destaque',
        intensity: 70,
        dominanceStyle: 'pressing' as const,
        description: 'Perfil em análise',
      };
    }
  }

  private async getTeamStatistics(teamName: string) {
    const matches = await this.prisma.footballMatch.findMany({
      where: {
        status: 'FT',
        OR: [{ homeTeam: teamName }, { awayTeam: teamName }],
      },
      orderBy: { date: 'desc' },
      take: 20,
    });

    if (!matches.length) {
      return {
        matchesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        averageGoalsPerMatch: 0,
        averageXG: 0,
      };
    }

    let wins = 0, draws = 0, losses = 0;
    let goalsFor = 0, goalsAgainst = 0;
    let totalXG = 0;

    for (const m of matches) {
      const isHome = m.homeTeam === teamName;
      const mGoalsFor = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
      const mGoalsAgainst = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);

      goalsFor += mGoalsFor;
      goalsAgainst += mGoalsAgainst;

      if (mGoalsFor > mGoalsAgainst) wins++;
      else if (mGoalsFor === mGoalsAgainst) draws++;
      else losses++;

      // Tenta scrape de xG
      try {
        const opponent = isHome ? m.awayTeam : m.homeTeam;
        const xg = await this.scraper.scrapeXG(teamName);
        if (xg) totalXG += xg;
      } catch {}
    }

    const count = matches.length;
    return {
      matchesPlayed: count,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      averageGoalsPerMatch: parseFloat((goalsFor / count).toFixed(2)),
      averageXG: parseFloat((totalXG / count).toFixed(2)),
    };
  }

  private async getRecentMatches(teamName: string) {
    const matches = await this.prisma.footballMatch.findMany({
      where: {
        status: 'FT',
        OR: [{ homeTeam: teamName }, { awayTeam: teamName }],
      },
      orderBy: { date: 'desc' },
      take: 5,
    });

    return matches.map(m => {
      const isHome = m.homeTeam === teamName;
      const opponent = isHome ? m.awayTeam : m.homeTeam;
      const goalsFor = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
      const goalsAgainst = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);

      let result = 'Empate';
      if (goalsFor > goalsAgainst) result = 'Vitória';
      else if (goalsFor < goalsAgainst) result = 'Derrota';

      const tacticsData = isHome ? (m.homeTactics as any) : (m.awayTactics as any);
      const tactics = tacticsData?.dominanceDescription || 'Análise em andamento';

      return {
        date: m.date.toISOString().split('T')[0],
        opponent,
        result,
        score: `${goalsFor}x${goalsAgainst}`,
        tactics,
      };
    });
  }

  private async fetchWebInsights(teamName: string): Promise<{
    recentNews: string[];
    pressAnalysis: string;
    teamSentiment: string;
  }> {
    try {
      this.logger.log(`[team-report] buscando insights web para ${teamName}...`);

      // Simula busca de notícias (em produção, integraria com APIs reais)
      const recentNews = [
        `${teamName} mantém preparação intensa para próxima rodada da Copa 2026`,
        `Técnico comenta sobre formação tática de ${teamName}`,
        `Análise: desempenho ofensivo de ${teamName} em alta`,
      ];

      // Gera análise via IA baseada em contexto
      const pressAnalysisResponse = await this.openai.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'Você é um analista de imprensa de futebol. Forneça uma análise breve (máx 150 chars) sobre a cobertura da mídia.',
          },
          {
            role: 'user',
            content: `Qual é a análise da imprensa internacional sobre ${teamName} na Copa 2026? Responda em português, máximo 150 caracteres.`,
          },
        ],
      } as any);

      const pressAnalysis = pressAnalysisResponse.choices[0].message.content || 'Análise em processamento';

      // Sentimento da torcida
      const sentimentResponse = await this.openai.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'Você analisa sentimento de torcedores. Responda com uma palavra: Otimista, Confiante, Neutro, Preocupado ou Pessimista.',
          },
          {
            role: 'user',
            content: `Qual é o sentimento geral dos torcedores de ${teamName} na Copa 2026?`,
          },
        ],
      } as any);

      const teamSentiment = sentimentResponse.choices[0].message.content || 'Confiante';

      return {
        recentNews,
        pressAnalysis: pressAnalysis.substring(0, 150),
        teamSentiment,
      };
    } catch (error: any) {
      this.logger.warn(`Erro ao buscar insights web: ${error.message}`);
      return {
        recentNews: ['Notícias em carregamento...'],
        pressAnalysis: 'Análise em processamento',
        teamSentiment: 'Confiante',
      };
    }
  }

  private async generateAIAnalysis(teamName: string): Promise<string> {
    try {
      const stats = await this.getTeamStatistics(teamName);

      const prompt = `Gere uma análise tática completa de ${teamName} para a Copa do Mundo 2026 (máx 300 caracteres).

Contexto:
- Jogos: ${stats.matchesPlayed}
- Vitórias: ${stats.wins}
- Gols marcados: ${stats.goalsFor}
- Gols sofridos: ${stats.goalsAgainst}
- Média de gols por jogo: ${stats.averageGoalsPerMatch}
- xG médio: ${stats.averageXG}

Inclua: estilo de jogo, pontos fortes, áreas de melhoria e perspectivas para próximos jogos.`;

      const response = await this.openai.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'Você é um analista tático de elite da Copa do Mundo 2026. Forneça análises profundas e precisas em português.',
          },
          { role: 'user', content: prompt },
        ],
      } as any);

      return response.choices[0].message.content || 'Análise em processamento';
    } catch (error: any) {
      this.logger.warn(`Erro ao gerar análise IA: ${error.message}`);
      return 'Análise tática em processamento. Tente novamente em alguns instantes.';
    }
  }
}
