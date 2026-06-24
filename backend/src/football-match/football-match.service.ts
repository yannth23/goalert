import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FootballApiService } from './football-api.service';
import { ScraperService } from './scraper.service';
import { getTodayRange, mapMatchToDto } from '../shared';

const LIVE_STATUSES       = new Set(['1H', 'HT', '2H', 'ET', 'PEN']);
const MAX_MATCH_DURATION  = 3 * 60 * 60 * 1000; // 3 horas é mais que suficiente para um jogo normal + intervalo

export interface H2HResult {
  homeTeam: string;
  awayTeam: string;
  homeWins: number;
  draws: number;
  awayWins: number;
  totalGoalsHome: number;
  totalGoalsAway: number;
  totalMatches: number;
  recentMatches: {
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    championship: string;
  }[];
}

@Injectable()
export class FootballMatchService {
  private readonly logger = new Logger(FootballMatchService.name);

  constructor(
    private readonly prisma:              PrismaService,
    private readonly footballApiService:  FootballApiService,
    private readonly scraper:             ScraperService,
  ) {}

  async getTodayMatches() {
    const { start, end } = getTodayRange();
    const now = new Date();

    // Cache deletion removed to allow normal cache behavior and avoid hitting API limits unnecessarily
    // The sync job handles cache invalidation when new data is fetched.

    this.logger.log(`Fetching matches from DB in range: ${start.toISOString()} - ${end.toISOString()}`);
    const matches = await this.prisma.footballMatch.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });
    this.logger.log(`Found ${matches.length} matches in DB`);
    const sanitised = matches.map(m => {
      const matchTime = new Date(m.date).getTime();
      const elapsedMs = now.getTime() - matchTime;
      
      // Lógica de segurança para evitar status "preso":
      // 1. Se o jogo está em status LIVE mas já se passaram mais de 3 horas do início
      // 2. Se o jogo está NS mas já se passaram mais de 3 horas e meia do início planejado
      // Só forçamos "FT" quando há placar registrado; sem placar, marcar como
      // encerrado é enganoso (mostra "Encerrado" sem resultado), então mantemos
      // o status real até a sincronização confirmar o resultado.
      const stale =
        (LIVE_STATUSES.has(m.status) && elapsedMs > MAX_MATCH_DURATION) ||
        (m.status === 'NS' && elapsedMs > MAX_MATCH_DURATION + 30 * 60 * 1000);
      if (stale) {
        const hasScore = m.homeScore !== null && m.awayScore !== null;
        if (hasScore) {
          return { ...m, status: 'FT' };
        }
        this.logger.warn(
          `Match ${m.id} (${m.homeTeam} x ${m.awayTeam}) está obsoleto (status=${m.status}) sem placar; mantendo status real.`,
        );
      }
      return m;
    });
    return sanitised.map(mapMatchToDto);
  }

  async getMatchesByCompetition(competition: string) {
    const matches = await this.prisma.footballMatch.findMany({
      where: { championship: { contains: competition, mode: 'insensitive' } },
      orderBy: { date: 'asc' },
    });
    return matches.map(mapMatchToDto);
  }

  async getCalendarData(month?: string): Promise<{ date: string; count: number }[]> {
    const now = new Date();
    let year = now.getFullYear(), mon = now.getMonth();
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      year = parseInt(month.slice(0, 4));
      mon  = parseInt(month.slice(5, 7)) - 1;
    }
    const start = new Date(year, mon, 1);
    const end   = new Date(year, mon + 1, 1);
    const matches = await this.prisma.footballMatch.findMany({
      where: { date: { gte: start, lt: end } },
      select: { date: true },
    });
    const counts: Record<string, number> = {};
    for (const m of matches) {
      const d = new Date(m.date);
      const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return Object.entries(counts).map(([date, count]) => ({ date, count })).sort((a,b) => a.date.localeCompare(b.date));
  }

  async getHeadToHead(team1: string, team2: string): Promise<H2HResult> {
    // 1. Tenta via scraping (Sofascore) — histórico real
    try {
      const scraped = await this.scraper.scrapeH2H(team1, team2);
      if (scraped && scraped.totalMatches > 0) {
        this.logger.log(`[h2h] dados do Sofascore: ${team1} vs ${team2} — ${scraped.totalMatches} jogos`);
        return {
          homeTeam: team1,
          awayTeam: team2,
          homeWins:       scraped.homeWins,
          draws:          scraped.draws,
          awayWins:       scraped.awayWins,
          totalGoalsHome: scraped.totalGoalsHome,
          totalGoalsAway: scraped.totalGoalsAway,
          totalMatches:   scraped.totalMatches,
          recentMatches:  scraped.recentMatches,
        };
      }
    } catch (err: any) {
      this.logger.warn(`[h2h] scraping falhou, usando banco: ${err.message}`);
    }

    // 2. Fallback: banco de dados local
    this.logger.log(`[h2h] usando banco de dados para ${team1} vs ${team2}`);
    const matches = await this.prisma.footballMatch.findMany({
      where: {
        status: 'FT',
        OR: [
          { homeTeam: { contains: team1, mode: 'insensitive' }, awayTeam: { contains: team2, mode: 'insensitive' } },
          { homeTeam: { contains: team2, mode: 'insensitive' }, awayTeam: { contains: team1, mode: 'insensitive' } },
        ],
      },
      orderBy: { date: 'desc' },
      take: 20,
    });

    let homeWins = 0, draws = 0, awayWins = 0;
    let totalGoalsHome = 0, totalGoalsAway = 0;

    for (const m of matches) {
      const hScore = m.homeScore ?? 0;
      const aScore = m.awayScore ?? 0;
      const isTeam1Home = m.homeTeam.toLowerCase().includes(team1.toLowerCase());

      totalGoalsHome += isTeam1Home ? hScore : aScore;
      totalGoalsAway += isTeam1Home ? aScore : hScore;

      if (hScore > aScore) {
        if (isTeam1Home) homeWins++; else awayWins++;
      } else if (hScore < aScore) {
        if (isTeam1Home) awayWins++; else homeWins++;
      } else {
        draws++;
      }
    }

    return {
      homeTeam: team1,
      awayTeam: team2,
      homeWins, draws, awayWins,
      totalGoalsHome, totalGoalsAway,
      totalMatches: matches.length,
      recentMatches: matches.slice(0, 5).map(m => ({
        date: m.date.toISOString().split('T')[0],
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore ?? 0,
        awayScore: m.awayScore ?? 0,
        championship: m.championship,
      })),
    };
  }

  async getSystemStatus() {
    const today = new Date().toISOString().split('T')[0];
    const { start, end } = getTodayRange();

    const [totalToday, liveNow] = await Promise.all([
      this.prisma.footballMatch.count({ where: { date: { gte: start, lte: end } } }),
      this.prisma.footballMatch.count({ where: { date: { gte: start, lte: end }, status: { in: ['1H','HT','2H','ET','PEN'] } } }),
    ]);

    return {
      lastSync:            null,
      matches:             { total: totalToday, live: liveNow },
      errorsToday:         0,
      consecutiveFailures: 0,
      serverTime:          new Date().toISOString(),
    };
  }

  async getStandings() { return this.footballApiService.getStandings(); }
  async getTopScorers() { return this.footballApiService.getTopScorers(); }

  async getTeamReport(teamName: string) {
    // 1. Verifica se já existe um relatório recente (menos de 6 horas)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const existing = await this.prisma.teamReport.findUnique({
      where: { teamName },
    });

    if (existing && existing.updatedAt > sixHoursAgo) {
      return existing;
    }

    // 2. Se não existe ou está velho, gera um novo usando a IA para pesquisar (simulado via prompt rico)
    // Em um cenário real com API de busca, aqui faríamos a chamada ao Google/Bing
    const openai = new (require('openai'))({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    const prompt = `
      Você é um analista de inteligência esportiva. Gere um relatório detalhado sobre a seleção de futebol do(a) ${teamName} para a Copa do Mundo 2026.
      Pesquise e considere (simule conhecimento atualizado):
      1. Notícias recentes de blogs e portais (lesões, convocações, clima no vestiário).
      2. Análise tática da imprensa local e internacional.
      3. Jogadores em destaque no momento.
      4. Estilo de jogo e variações táticas recentes.

      Responda em formato JSON:
      {
        "report": "Texto longo em markdown com a análise completa (mínimo 300 palavras)",
        "news": [
          {"title": "Título da notícia", "source": "Nome do site", "summary": "Resumo curto"}
        ]
      }
    `;

    try {
      const response = await openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const data = JSON.parse(response.choices[0].message.content);
      
      return this.prisma.teamReport.upsert({
        where: { teamName },
        update: { report: data.report, news: data.news },
        create: { teamName, report: data.report, news: data.news },
      });
    } catch (err) {
      this.logger.error(`Failed to generate team report for ${teamName}: ${err.message}`);
      return existing || { teamName, report: 'Relatório temporariamente indisponível.', news: [] };
    }
  }
  async deleteAllMatches(): Promise<{ deleted: number }> {
    const result = await this.prisma.footballMatch.deleteMany({});
    return { deleted: result.count };
  }

  async getMatchesWithoutTactics(): Promise<{ id: string; homeTeam: string; awayTeam: string }[]> {
    return this.prisma.footballMatch.findMany({
      where: { homeTactics: { equals: null } },
      select: { id: true, homeTeam: true, awayTeam: true },
    });
  }
}
