/**
 * Ligas de clube cobertas pela página de Clubes (separada da Copa do Mundo).
 * Escopo inicial: Brasileirão + Top 5 da Europa. Os jogos vêm da mesma fonte
 * (Football-Data.org) que já alimenta a Copa — o sync guarda cada jogo com
 * `championship` = nome da competição, e o matcher abaixo reconhece a qual das
 * nossas ligas aquele nome pertence (os nomes variam: "Campeonato Brasileiro
 * Série A", "Primera Division", etc.).
 */

export interface ClubLeague {
  /** Código Football-Data.org da competição. */
  code: string;
  /** Nome curto exibido no frontend. */
  name: string;
  /** Emoji do país/liga para a UI. */
  emoji: string;
}

export const CLUB_LEAGUES: ClubLeague[] = [
  { code: 'BSA', name: 'Brasileirão',    emoji: '🇧🇷' },
  { code: 'PL',  name: 'Premier League', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'PD',  name: 'La Liga',        emoji: '🇪🇸' },
  { code: 'SA',  name: 'Serie A',        emoji: '🇮🇹' },
  { code: 'BL1', name: 'Bundesliga',     emoji: '🇩🇪' },
  { code: 'FL1', name: 'Ligue 1',        emoji: '🇫🇷' },
];

export const CLUB_LEAGUE_CODES = CLUB_LEAGUES.map(l => l.code);

/**
 * Regras de reconhecimento por nome de competição. Brasil vem ANTES da Itália
 * de propósito: o nome brasileiro contém "Série A" (com acento) e o italiano
 * "Serie A" (sem) — testar Brasil primeiro evita classificar o Brasileirão como
 * Serie A italiana.
 */
const NAME_MATCHERS: { re: RegExp; code: string }[] = [
  { re: /brasileir|s[ée]rie\s*a\s*brazil|campeonato\s*brasileiro/i, code: 'BSA' },
  { re: /premier\s*league/i,                                        code: 'PL'  },
  { re: /primera\s*divisi|la\s*liga|laliga/i,                       code: 'PD'  },
  { re: /bundesliga/i,                                              code: 'BL1' },
  { re: /ligue\s*1/i,                                               code: 'FL1' },
  { re: /serie\s*a/i,                                               code: 'SA'  }, // Itália (fallback, depois do Brasil)
];

const CODE_TO_LEAGUE: Record<string, ClubLeague> = Object.fromEntries(
  CLUB_LEAGUES.map(l => [l.code, l]),
);

/** Retorna a liga de clube correspondente ao nome da competição, ou null. */
export function matchClubLeague(championship: string | null | undefined): ClubLeague | null {
  if (!championship) return null;
  for (const { re, code } of NAME_MATCHERS) {
    if (re.test(championship)) return CODE_TO_LEAGUE[code] ?? null;
  }
  return null;
}

/** True se o nome da competição for uma das nossas ligas de clube. */
export function isClubCompetition(championship: string | null | undefined): boolean {
  return matchClubLeague(championship) !== null;
}
