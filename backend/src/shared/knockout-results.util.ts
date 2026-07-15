/**
 * RESULTADOS ESTÁTICOS E OFICIAIS do mata-mata da Copa do Mundo FIFA 2026.
 *
 * POR QUE ISSO EXISTE:
 * Até aqui o bracket era 100% dinâmico — dependia de o sync do API-Football ter
 * TODOS os jogos da Copa (grupos + mata-mata) completos e corretos no nosso
 * banco. Quando faltava jogo, a fase de grupos nunca "fechava" e a Rd32 nunca
 * resolvia (tudo "A definir"); quando a árvore de avanço divergia da árvore
 * real da FIFA, apareciam confrontos errados nas Oitavas/Semis. Como o torneio
 * já está praticamente decidido, congelamos aqui a verdade — jogo por jogo —
 * e servimos isso direto, sem depender de sync externo.
 *
 * ORIENTAÇÃO home/away: segue a árvore do bracket (homeSlot/awaySlot do fixture
 * e os pares de avanço já corrigidos em ROUND_OF_16_PAIRS e getNextSlotFor), de
 * forma que o placar case com o lado certo do slot.
 *
 * PÊNALTIS: o schema não tem coluna de disputa de pênaltis. Para jogos decididos
 * nos pênaltis guardamos o placar do tempo normal/prorrogação (empate) + o
 * vencedor. O frontend detecta "empate com vencedor em jogo DONE" e mostra o
 * selo "(pên)". Jogos vencidos na prorrogação guardam o placar final real.
 */

export type KnockoutStatus = 'RESOLVED' | 'DONE';

export interface KnockoutResult {
  gameNumber: number;
  phase: 'r32' | 'r16' | 'quartas' | 'semi' | 'final';
  homeTeam: string;
  awayTeam: string | null;
  homeScore: number | null;
  awayScore: number | null;
  winner: string | null;
  status: KnockoutStatus;
  /** Nota de desempate (pênaltis/prorrogação), placar na ordem home–away. */
  note?: string;
}

export const KNOCKOUT_RESULTS: KnockoutResult[] = [
  // ── Rd. de 32 (jogos 73-88) ──────────────────────────────────────────────
  { gameNumber: 73, phase: 'r32', homeTeam: 'África do Sul',       awayTeam: 'Canadá',               homeScore: 0, awayScore: 1, winner: 'Canadá',        status: 'DONE' },
  { gameNumber: 74, phase: 'r32', homeTeam: 'Alemanha',            awayTeam: 'Paraguai',             homeScore: 1, awayScore: 1, winner: 'Paraguai',      status: 'DONE', note: 'Pênaltis 3–4' },
  { gameNumber: 75, phase: 'r32', homeTeam: 'Holanda',             awayTeam: 'Marrocos',             homeScore: 1, awayScore: 1, winner: 'Marrocos',      status: 'DONE', note: 'Pênaltis 2–3' },
  { gameNumber: 76, phase: 'r32', homeTeam: 'Brasil',              awayTeam: 'Japão',                homeScore: 2, awayScore: 1, winner: 'Brasil',        status: 'DONE' },
  { gameNumber: 77, phase: 'r32', homeTeam: 'França',              awayTeam: 'Suécia',               homeScore: 3, awayScore: 0, winner: 'França',        status: 'DONE' },
  { gameNumber: 78, phase: 'r32', homeTeam: 'Costa do Marfim',     awayTeam: 'Noruega',              homeScore: 1, awayScore: 2, winner: 'Noruega',       status: 'DONE' },
  { gameNumber: 79, phase: 'r32', homeTeam: 'México',              awayTeam: 'Equador',              homeScore: 2, awayScore: 0, winner: 'México',        status: 'DONE' },
  { gameNumber: 80, phase: 'r32', homeTeam: 'Inglaterra',          awayTeam: 'RD Congo',             homeScore: 2, awayScore: 1, winner: 'Inglaterra',    status: 'DONE' },
  { gameNumber: 81, phase: 'r32', homeTeam: 'Estados Unidos',      awayTeam: 'Bósnia e Herzegovina', homeScore: 2, awayScore: 0, winner: 'Estados Unidos', status: 'DONE' },
  { gameNumber: 82, phase: 'r32', homeTeam: 'Bélgica',             awayTeam: 'Senegal',              homeScore: 3, awayScore: 2, winner: 'Bélgica',       status: 'DONE', note: 'Após prorrogação' },
  { gameNumber: 83, phase: 'r32', homeTeam: 'Colômbia',            awayTeam: 'Gana',                 homeScore: 1, awayScore: 0, winner: 'Colômbia',      status: 'DONE' },
  { gameNumber: 84, phase: 'r32', homeTeam: 'Espanha',             awayTeam: 'Áustria',              homeScore: 3, awayScore: 0, winner: 'Espanha',       status: 'DONE' },
  { gameNumber: 85, phase: 'r32', homeTeam: 'Suíça',               awayTeam: 'Argélia',              homeScore: 2, awayScore: 0, winner: 'Suíça',         status: 'DONE' },
  { gameNumber: 86, phase: 'r32', homeTeam: 'Argentina',           awayTeam: 'Cabo Verde',           homeScore: 3, awayScore: 2, winner: 'Argentina',     status: 'DONE', note: 'Após prorrogação' },
  { gameNumber: 87, phase: 'r32', homeTeam: 'Portugal',            awayTeam: 'Croácia',              homeScore: 2, awayScore: 1, winner: 'Portugal',      status: 'DONE' },
  { gameNumber: 88, phase: 'r32', homeTeam: 'Austrália',           awayTeam: 'Egito',                homeScore: 1, awayScore: 1, winner: 'Egito',         status: 'DONE', note: 'Pênaltis 2–4' },

  // ── Oitavas (jogos 89-96) ────────────────────────────────────────────────
  { gameNumber: 89, phase: 'r16', homeTeam: 'Canadá',              awayTeam: 'Marrocos',             homeScore: 0, awayScore: 3, winner: 'Marrocos',      status: 'DONE' },
  { gameNumber: 90, phase: 'r16', homeTeam: 'Paraguai',            awayTeam: 'França',               homeScore: 0, awayScore: 1, winner: 'França',        status: 'DONE' },
  { gameNumber: 91, phase: 'r16', homeTeam: 'Brasil',              awayTeam: 'Noruega',              homeScore: 1, awayScore: 2, winner: 'Noruega',       status: 'DONE' },
  { gameNumber: 92, phase: 'r16', homeTeam: 'México',              awayTeam: 'Inglaterra',           homeScore: 2, awayScore: 3, winner: 'Inglaterra',    status: 'DONE' },
  { gameNumber: 93, phase: 'r16', homeTeam: 'Estados Unidos',      awayTeam: 'Bélgica',              homeScore: 1, awayScore: 4, winner: 'Bélgica',       status: 'DONE' },
  { gameNumber: 94, phase: 'r16', homeTeam: 'Espanha',             awayTeam: 'Portugal',             homeScore: 1, awayScore: 0, winner: 'Espanha',       status: 'DONE' },
  { gameNumber: 95, phase: 'r16', homeTeam: 'Argentina',           awayTeam: 'Egito',                homeScore: 3, awayScore: 2, winner: 'Argentina',     status: 'DONE' },
  { gameNumber: 96, phase: 'r16', homeTeam: 'Colômbia',            awayTeam: 'Suíça',                homeScore: 0, awayScore: 0, winner: 'Suíça',         status: 'DONE', note: 'Pênaltis 3–4' },

  // ── Quartas (jogos 97-100) ───────────────────────────────────────────────
  { gameNumber: 97,  phase: 'quartas', homeTeam: 'Marrocos',       awayTeam: 'França',               homeScore: 0, awayScore: 2, winner: 'França',        status: 'DONE' },
  { gameNumber: 98,  phase: 'quartas', homeTeam: 'Noruega',        awayTeam: 'Inglaterra',           homeScore: 1, awayScore: 2, winner: 'Inglaterra',    status: 'DONE' },
  { gameNumber: 99,  phase: 'quartas', homeTeam: 'Bélgica',        awayTeam: 'Espanha',              homeScore: 1, awayScore: 2, winner: 'Espanha',       status: 'DONE' },
  { gameNumber: 100, phase: 'quartas', homeTeam: 'Argentina',      awayTeam: 'Suíça',                homeScore: 3, awayScore: 1, winner: 'Argentina',     status: 'DONE' },

  // ── Semifinais (jogos 101-102) ───────────────────────────────────────────
  { gameNumber: 101, phase: 'semi', homeTeam: 'França',            awayTeam: 'Espanha',              homeScore: 0, awayScore: 2, winner: 'Espanha',       status: 'DONE' },
  // Inglaterra x Argentina — 15/07/2026, ainda não decidido. Teams travados, resultado em aberto.
  { gameNumber: 102, phase: 'semi', homeTeam: 'Inglaterra',        awayTeam: 'Argentina',            homeScore: null, awayScore: null, winner: null,      status: 'RESOLVED' },

  // ── Final (jogo 104) ─────────────────────────────────────────────────────
  // Espanha (vencedor da SF1) x vencedor de Inglaterra/Argentina. 19/07/2026.
  { gameNumber: 104, phase: 'final', homeTeam: 'Espanha',          awayTeam: null,                   homeScore: null, awayScore: null, winner: null,      status: 'RESOLVED' },
];
