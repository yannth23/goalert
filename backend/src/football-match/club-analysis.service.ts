import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { matchClubLeague } from '../shared';
import OpenAI from 'openai';

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'PEN', 'LIVE']);

export interface LiveDynamics {
  /** Probabilidades de resultado (somam 100). */
  winProbHome: number;
  drawProb: number;
  winProbAway: number;
  /** Quem está mandando no jogo agora. */
  momentum: 'home' | 'away' | 'balanced';
  /** Probabilidade (0-100) de cada lado marcar o próximo gol. */
  nextGoal: { home: number; away: number };
  /** Leitura tática curta do momento do jogo. */
  tacticalRead: string;
  /** 2-4 cenários do que pode vir a ocorrer, por probabilidade. */
  whatMayHappen: string[];
  /** O maior risco/decisão do jogo agora. */
  keyRisk: string;
  /** Modelo que gerou (groq | fallback). */
  provider: 'groq' | 'fallback';
  /** Fase considerada (pré-jogo, ao vivo, encerrado). */
  phase: 'pre' | 'live' | 'post';
}

// Cadeia de modelos Groq gratuitos — mais capaz → mais rápido.
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'qwen/qwen3-32b', 'llama-3.1-8b-instant'];

@Injectable()
export class ClubAnalysisService {
  private readonly logger = new Logger(ClubAnalysisService.name);
  private readonly groq: OpenAI | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    this.groq = process.env.GROQ_API_KEY
      ? new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
      : null;

    if (!this.groq) {
      this.logger.warn('GROQ_API_KEY ausente — análise ao vivo cairá no fallback determinístico');
    }
  }

  /**
   * Dinâmica tática ao vivo de um jogo de clube, com probabilidade "do que pode
   * vir a ocorrer". Gerada pelo Groq/Llama, com cache no Redis por
   * (jogo, status, placar) para não repetir chamada de LLM a cada refresh.
   */
  async getLiveDynamics(matchId: string): Promise<LiveDynamics | null> {
    const match = await this.prisma.footballMatch.findUnique({ where: { id: matchId } });
    if (!match) return null;

    const isLive = LIVE_STATUSES.has(match.status);
    const isDone = match.status === 'FT';
    const phase: LiveDynamics['phase'] = isLive ? 'live' : isDone ? 'post' : 'pre';

    // Chave de cache: muda quando o placar/status muda. Jogo ao vivo revalida a
    // cada gol; pré/pós ficam estáveis. TTL curto no ao vivo, longo no resto.
    const scoreKey = `${match.homeScore ?? '-'}-${match.awayScore ?? '-'}`;
    const cacheKey = `dynamics:${matchId}:${match.status}:${scoreKey}`;
    const cached = await this.redis.getJson<LiveDynamics>(cacheKey);
    if (cached) return cached;

    const league = matchClubLeague(match.championship);
    const ctx = {
      home: match.homeTeam,
      away: match.awayTeam,
      league: league?.name ?? match.championship,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      phase,
    };

    let result: LiveDynamics | null = null;
    if (this.groq) {
      result = await this.viaGroq(ctx).catch(err => {
        this.logger.warn(`Groq falhou (${err.message}) — usando fallback`);
        return null;
      });
    }
    if (!result) result = this.fallback(ctx);

    const ttl = isLive ? 90 : isDone ? 86400 : 1800;
    await this.redis.setJson(cacheKey, result, ttl);
    return result;
  }

  private buildPrompt(ctx: {
    home: string; away: string; league: string; status: string;
    homeScore: number | null; awayScore: number | null; phase: LiveDynamics['phase'];
  }): { system: string; user: string } {
    const scoreLine =
      ctx.homeScore !== null && ctx.awayScore !== null
        ? `Placar atual: ${ctx.home} ${ctx.homeScore} x ${ctx.awayScore} ${ctx.away}.`
        : 'Jogo ainda não começou (sem placar).';
    const phaseLine =
      ctx.phase === 'live'
        ? `AO VIVO (status ${ctx.status}). Analise o momento do jogo AGORA e o que tende a acontecer no restante.`
        : ctx.phase === 'post'
        ? 'Jogo ENCERRADO. Faça uma leitura pós-jogo tática.'
        : 'PRÉ-JOGO. Projete como o confronto tende a se desenrolar.';

    const system =
      'Você é um analista tático de futebol de clubes brasileiro, direto e técnico ' +
      '(estilo PVC/Arnaldo). Responda SEMPRE e SOMENTE um objeto JSON válido, sem markdown, ' +
      'sem texto fora do JSON. Probabilidades são inteiros que somam 100.';

    const user =
      `Confronto: ${ctx.home} x ${ctx.away} — ${ctx.league}.\n${scoreLine}\n${phaseLine}\n\n` +
      `Responda APENAS este JSON:\n` +
      `{\n` +
      `  "winProbHome": number, "drawProb": number, "winProbAway": number,\n` +
      `  "momentum": "home|away|balanced",\n` +
      `  "nextGoal": { "home": number, "away": number },\n` +
      `  "tacticalRead": "string (até 200 chars) — leitura tática do momento",\n` +
      `  "whatMayHappen": ["string", "string", "string"],\n` +
      `  "keyRisk": "string (até 120 chars) — o que decide o jogo agora"\n` +
      `}`;
    return { system, user };
  }

  private async viaGroq(ctx: Parameters<ClubAnalysisService['buildPrompt']>[0]): Promise<LiveDynamics> {
    const { system, user } = this.buildPrompt(ctx);
    for (const model of GROQ_MODELS) {
      try {
        const res = await this.groq!.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          response_format: { type: 'json_object' },
        } as any);
        const text = res.choices[0]?.message?.content ?? '';
        return this.parse(text, ctx);
      } catch {
        // tenta próximo modelo
      }
    }
    throw new Error('todos os modelos Groq falharam');
  }

  /** Extrai e valida o JSON da resposta do LLM; normaliza probabilidades. */
  private parse(
    raw: string,
    ctx: Parameters<ClubAnalysisService['buildPrompt']>[0],
  ): LiveDynamics {
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('sem JSON na resposta');
    const data = JSON.parse(cleaned.slice(start, end + 1));

    let h = Math.max(0, Math.round(Number(data.winProbHome) || 0));
    let d = Math.max(0, Math.round(Number(data.drawProb) || 0));
    let a = Math.max(0, Math.round(Number(data.winProbAway) || 0));
    const sum = h + d + a;
    if (sum <= 0) { h = 40; d = 25; a = 35; }
    else if (sum !== 100) { h = Math.round((h / sum) * 100); d = Math.round((d / sum) * 100); a = 100 - h - d; }

    const ng = data.nextGoal ?? {};
    const ngHome = Math.min(100, Math.max(0, Math.round(Number(ng.home) || 50)));
    const ngAway = Math.min(100, Math.max(0, Math.round(Number(ng.away) || 50)));

    const momentum = ['home', 'away', 'balanced'].includes(data.momentum) ? data.momentum : 'balanced';

    const whatMayHappen = Array.isArray(data.whatMayHappen)
      ? data.whatMayHappen.filter((s: any) => typeof s === 'string' && s.trim()).slice(0, 4)
      : [];
    if (whatMayHappen.length === 0) whatMayHappen.push('Jogo aberto — próximo lance pode decidir.');

    return {
      winProbHome: h,
      drawProb: d,
      winProbAway: a,
      momentum,
      nextGoal: { home: ngHome, away: ngAway },
      tacticalRead: String(data.tacticalRead || `${ctx.home} x ${ctx.away}: confronto de estilos.`).slice(0, 240),
      whatMayHappen,
      keyRisk: String(data.keyRisk || 'Bola parada e transições podem definir.').slice(0, 160),
      provider: 'groq',
      phase: ctx.phase,
    };
  }

  /** Fallback determinístico quando o Groq não responde. */
  private fallback(ctx: Parameters<ClubAnalysisService['buildPrompt']>[0]): LiveDynamics {
    const hs = ctx.homeScore ?? 0;
    const as_ = ctx.awayScore ?? 0;
    // Mando de campo + placar dão um viés simples.
    let h = 45, d = 27, a = 28;
    if (hs > as_) { h = 62; d = 22; a = 16; }
    else if (as_ > hs) { h = 20; d = 24; a = 56; }
    const momentum = hs > as_ ? 'home' : as_ > hs ? 'away' : 'balanced';
    return {
      winProbHome: h,
      drawProb: d,
      winProbAway: a,
      momentum,
      nextGoal: { home: momentum === 'home' ? 58 : 45, away: momentum === 'away' ? 58 : 45 },
      tacticalRead: `${ctx.home} joga em casa e tende a ter a iniciativa; ${ctx.away} aposta nas transições.`,
      whatMayHappen: [
        'Jogo decidido em bola parada ou lance individual.',
        'Time que abrir o placar tende a controlar o ritmo.',
      ],
      keyRisk: 'Erro defensivo em transição pode ser fatal.',
      provider: 'fallback',
      phase: ctx.phase,
    };
  }
}
