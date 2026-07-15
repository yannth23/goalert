import { TEAM_TRANSLATIONS, translateTeam } from '../football-match/translation.util';

/**
 * Fonte única da verdade sobre metadata de seleções da Copa do Mundo FIFA 2026:
 * bandeiras (emoji) e composição oficial dos 12 grupos, em português — o mesmo
 * idioma que translateTeam() já persiste no banco via FootballApiService.
 *
 * POR QUE ISSO EXISTE:
 * Antes desta refatoração, o frontend mantinha uma cópia manual duplicada dos
 * nomes de time (GROUP_TEAMS em inglês) enquanto o backend salvava em português
 * via translateTeam(). Isso já causou pelo menos dois bugs de produção onde o
 * bracket ficava com tudo "A definir" porque 'Mexico' !== 'México'.
 *
 * Regra: o frontend NUNCA deve manter sua própria cópia de nomes de time,
 * bandeiras ou composição de grupos. Sempre consumir via GET /matches/metadata.
 */

export const TEAM_FLAGS: Record<string, string> = {
  'Brasil': '🇧🇷', 'Argentina': '🇦🇷', 'França': '🇫🇷', 'Alemanha': '🇩🇪',
  'Espanha': '🇪🇸', 'Portugal': '🇵🇹', 'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Itália': '🇮🇹',
  'Holanda': '🇳🇱', 'Bélgica': '🇧🇪', 'Uruguai': '🇺🇾', 'Croácia': '🇭🇷',
  'Marrocos': '🇲🇦', 'Japão': '🇯🇵', 'Coreia do Sul': '🇰🇷', 'Estados Unidos': '🇺🇸',
  'México': '🇲🇽', 'Canadá': '🇨🇦', 'Senegal': '🇸🇳', 'Equador': '🇪🇨',
  'Colômbia': '🇨🇴', 'Suíça': '🇨🇭', 'Dinamarca': '🇩🇰', 'Polônia': '🇵🇱',
  'Austrália': '🇦🇺', 'Catar': '🇶🇦', 'Arábia Saudita': '🇸🇦', 'Irã': '🇮🇷',
  'Turquia': '🇹🇷', 'Ucrânia': '🇺🇦', 'Áustria': '🇦🇹', 'Suécia': '🇸🇪',
  'Noruega': '🇳🇴', 'Sérvia': '🇷🇸', 'Escócia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Haiti': '🇭🇹',
  'Costa do Marfim': '🇨🇮', 'Nigéria': '🇳🇬', 'Gana': '🇬🇭', 'Camarões': '🇨🇲',
  'Panamá': '🇵🇦', 'Peru': '🇵🇪', 'Chile': '🇨🇱', 'Venezuela': '🇻🇪',
  'Paraguai': '🇵🇾', 'Bolívia': '🇧🇴', 'Curaçau': '🇨🇼', 'Cabo Verde': '🇨🇻',
  'Iraque': '🇮🇶', 'Argélia': '🇩🇿', 'Tchéquia': '🇨🇿', 'Azerbaijão': '🇦🇿',
  'África do Sul': '🇿🇦', 'Bósnia e Herzegovina': '🇧🇦', 'Nova Zelândia': '🇳🇿',
  'Egito': '🇪🇬', 'Jordânia': '🇯🇴', 'RD Congo': '🇨🇩', 'Uzbequistão': '🇺🇿',
  'Tunísia': '🇹🇳',
};

/**
 * Composição oficial dos 12 grupos da Copa do Mundo FIFA 2026, confirmada
 * após o sorteio de 5 de dezembro de 2025. Nomes em português (padrão translateTeam).
 */
export const WORLD_CUP_GROUPS: Record<string, string[]> = {
  'A': ['México', 'África do Sul', 'Coreia do Sul', 'Tchéquia'],
  'B': ['Canadá', 'Bósnia e Herzegovina', 'Catar', 'Suíça'],
  'C': ['Brasil', 'Marrocos', 'Haiti', 'Escócia'],
  'D': ['Estados Unidos', 'Paraguai', 'Austrália', 'Turquia'],
  'E': ['Alemanha', 'Curaçau', 'Costa do Marfim', 'Equador'],
  'F': ['Holanda', 'Japão', 'Suécia', 'Tunísia'],
  'G': ['Bélgica', 'Egito', 'Irã', 'Nova Zelândia'],
  'H': ['Espanha', 'Cabo Verde', 'Arábia Saudita', 'Uruguai'],
  'I': ['França', 'Senegal', 'Iraque', 'Noruega'],
  'J': ['Argentina', 'Argélia', 'Áustria', 'Jordânia'],
  'K': ['Portugal', 'RD Congo', 'Uzbequistão', 'Colômbia'],
  'L': ['Inglaterra', 'Croácia', 'Gana', 'Panamá'],
};

/** Grupos cujos 3ºs colocados avançaram como "melhores 3ºs" nesta edição (confirmado FIFA). */
export const QUALIFIED_THIRD_GROUPS = ['B', 'D', 'E', 'F', 'I', 'J', 'K', 'L'];

/**
 * Tabela oficial da Rd. de 32 (jogos 73-88), fonte: fixture FIFA publicado
 * após o sorteio. homeSlot/awaySlot usam a notação:
 *   "1A" = 1º colocado do grupo A
 *   "2B" = 2º colocado do grupo B
 *   "3ABCDF" = melhor 3º colocado entre os grupos A, B, C, D, F
 */
export const ROUND_OF_32_FIXTURE: { id: number; homeSlot: string; awaySlot: string }[] = [
  { id: 73, homeSlot: '2A', awaySlot: '2B' },
  { id: 74, homeSlot: '1E', awaySlot: '3ABCDF' },
  { id: 75, homeSlot: '1F', awaySlot: '2C' },
  { id: 76, homeSlot: '1C', awaySlot: '2F' },
  { id: 77, homeSlot: '1I', awaySlot: '3CDFGH' },
  { id: 78, homeSlot: '2E', awaySlot: '2I' },
  { id: 79, homeSlot: '1A', awaySlot: '3CEFHI' },
  { id: 80, homeSlot: '1L', awaySlot: '3EHIJK' },
  { id: 81, homeSlot: '1D', awaySlot: '3BEFIJ' },
  { id: 82, homeSlot: '1G', awaySlot: '3AEHIJ' },
  { id: 83, homeSlot: '2K', awaySlot: '2L' },
  { id: 84, homeSlot: '1H', awaySlot: '2J' },
  { id: 85, homeSlot: '1B', awaySlot: '3EFGIJ' },
  { id: 86, homeSlot: '1J', awaySlot: '2H' },
  { id: 87, homeSlot: '1K', awaySlot: '3DEIJL' },
  { id: 88, homeSlot: '2D', awaySlot: '2G' },
];

/**
 * Pares oficiais (não-sequenciais) da Rd. de 16, ex: Vencedor(73) vs Vencedor(75).
 * A ordem posiciona cada par no jogo 89..96 (índice 0 → jogo 89, etc.).
 *
 * CORREÇÃO (árvore FIFA 2026): os pares do quadrante K/L estavam errados —
 * estavam [83,84] e [85,87], o que montava Espanha×Colômbia e Suíça×Portugal.
 * A árvore real gerou Espanha×Portugal (jogo 94) e Suíça×Colômbia (jogo 96),
 * então os pares corretos são [84,87] e [83,85].
 */
export const ROUND_OF_16_PAIRS: [number, number][] = [
  [73, 75], [74, 77], [76, 78], [79, 80],
  [81, 82], [84, 87], [86, 88], [83, 85],
];

export function getTeamFlag(teamName: string): string {
  return TEAM_FLAGS[teamName] || '';
}

export function getGroupOf(teamName: string): string | null {
  for (const [letter, teams] of Object.entries(WORLD_CUP_GROUPS)) {
    if (teams.includes(teamName)) return letter;
  }
  return null;
}

// Reexporta translateTeam para quem já importa daqui — evita import de dois lugares.
export { translateTeam, TEAM_TRANSLATIONS };
