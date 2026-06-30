'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const FLAGS: Record<string, string> = {
  'Brazil': '🇧🇷', 'Brasil': '🇧🇷',
  'Argentina': '🇦🇷',
  'France': '🇫🇷', 'França': '🇫🇷',
  'Germany': '🇩🇪', 'Alemanha': '🇩🇪',
  'Spain': '🇪🇸', 'Espanha': '🇪🇸',
  'Portugal': '🇵🇹',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Italy': '🇮🇹', 'Itália': '🇮🇹',
  'Netherlands': '🇳🇱', 'Holanda': '🇳🇱',
  'Belgium': '🇧🇪', 'Bélgica': '🇧🇪',
  'Uruguay': '🇺🇾', 'Uruguai': '🇺🇾',
  'Croatia': '🇭🇷', 'Croácia': '🇭🇷',
  'Morocco': '🇲🇦', 'Marrocos': '🇲🇦',
  'Japan': '🇯🇵', 'Japão': '🇯🇵',
  'South Korea': '🇰🇷', 'Coreia do Sul': '🇰🇷',
  'United States': '🇺🇸', 'EUA': '🇺🇸',
  'Mexico': '🇲🇽', 'México': '🇲🇽',
  'Canada': '🇨🇦', 'Canadá': '🇨🇦',
  'Senegal': '🇸🇳',
  'Ecuador': '🇪🇨', 'Equador': '🇪🇨',
  'Colombia': '🇨🇴', 'Colômbia': '🇨🇴',
  'Switzerland': '🇨🇭', 'Suíça': '🇨🇭',
  'Denmark': '🇩🇰', 'Dinamarca': '🇩🇰',
  'Poland': '🇵🇱', 'Polônia': '🇵🇱',
  'Australia': '🇦🇺', 'Austrália': '🇦🇺',
  'Qatar': '🇶🇦', 'Catar': '🇶🇦',
  'Saudi Arabia': '🇸🇦', 'Arábia Saudita': '🇸🇦',
  'Iran': '🇮🇷', 'Irã': '🇮🇷',
  'Turkey': '🇹🇷', 'Türkiye': '🇹🇷', 'Turquia': '🇹🇷',
  'Ukraine': '🇺🇦', 'Ucrânia': '🇺🇦',
  'Austria': '🇦🇹', 'Áustria': '🇦🇹',
  'Sweden': '🇸🇪', 'Suécia': '🇸🇪',
  'Norway': '🇳🇴', 'Noruega': '🇳🇴',
  'Serbia': '🇷🇸', 'Sérvia': '🇷🇸',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Escócia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  "Côte d'Ivoire": '🇨🇮', 'Ivory Coast': '🇨🇮', 'Costa do Marfim': '🇨🇮',
  'Nigeria': '🇳🇬', 'Nigéria': '🇳🇬',
  'Ghana': '🇬🇭', 'Gana': '🇬🇭',
  'Cameroon': '🇨🇲', 'Camarões': '🇨🇲',
  'Panama': '🇵🇦', 'Panamá': '🇵🇦',
  'Peru': '🇵🇪',
  'Chile': '🇨🇱',
  'Venezuela': '🇻🇪',
  'Paraguay': '🇵🇾', 'Paraguai': '🇵🇾',
  'Bolivia': '🇧🇴', 'Bolívia': '🇧🇴',
  'Curaçau': '🇨🇼', 'Curaçao': '🇨🇼',
  'Cabo Verde': '🇨🇻', 'Cape Verde': '🇨🇻',
  'Iraq': '🇮🇶', 'Iraque': '🇮🇶',
  'Algeria': '🇩🇿', 'Argélia': '🇩🇿',
  'Czech Republic': '🇨🇿', 'Tchéquia': '🇨🇿',
  'Haiti': '🇭🇹',
  'Azerbaijan': '🇦🇿', 'Azerbaijão': '🇦🇿',
};

// Composição oficial dos 12 grupos da Copa 2026 — usado como fonte de verdade
// para agrupar os times mesmo se a API não fornecer "group" explícito.
const GROUP_TEAMS: Record<string, string[]> = {
  'A': ['EUA', 'Panamá', 'Bolívia', 'Argélia'],
  'B': ['Argentina', 'Chile', 'Peru', 'Canadá'],
  'C': ['Brasil', 'Colômbia', 'Equador', 'Catar'],
  'D': ['Espanha', 'Croácia', 'Marrocos', 'Azerbaijão'],
  'E': ['França', 'Bélgica', 'Itália', 'Camarões'],
  'F': ['Portugal', 'Polônia', 'Tchéquia', 'Iraque'],
  'G': ['Alemanha', 'Japão', 'EUA', 'Arábia Saudita'],
  'H': ['Inglaterra', 'Sérvia', 'Escócia', 'Senegal'],
  'I': ['Holanda', 'Dinamarca', 'Áustria', 'Nigéria'],
  'J': ['Uruguai', 'Noruega', 'Suíça', 'Costa do Marfim'],
  'K': ['Coreia do Sul', 'Austrália', 'Irã', 'Gana'],
  'L': ['México', 'Ucrânia', 'Turquia', 'Cabo Verde'],
};

// Estrutura de avanço: cada fase usa os vencedores da fase anterior, em pares.
// Rd32 (jogos 49-64) -> Oitavas oficiais (8 jogos) -> Quartas (4) -> Semi (2) -> Final (1)
const QUARTERFINAL_PAIRS: [number, number][] = [
  [49, 50], [51, 52], [53, 54], [55, 56], [57, 58], [59, 60], [61, 62], [63, 64],
];

const BRACKET_SLOTS = [
  { id: 49, homeSlot: '1A', awaySlot: '2B' },
  { id: 50, homeSlot: '1C', awaySlot: '2D' },
  { id: 51, homeSlot: '1E', awaySlot: '2F' },
  { id: 52, homeSlot: '1G', awaySlot: '2H' },
  { id: 53, homeSlot: '1I', awaySlot: '2J' },
  { id: 54, homeSlot: '1K', awaySlot: '2L' },
  { id: 55, homeSlot: '1B', awaySlot: '2A' },
  { id: 56, homeSlot: '1D', awaySlot: '2C' },
  { id: 57, homeSlot: '1F', awaySlot: '2E' },
  { id: 58, homeSlot: '1H', awaySlot: '2G' },
  { id: 59, homeSlot: '1J', awaySlot: '2I' },
  { id: 60, homeSlot: '1L', awaySlot: '2K' },
  { id: 61, homeSlot: '3RD_0', awaySlot: '3RD_1' },
  { id: 62, homeSlot: '3RD_2', awaySlot: '3RD_3' },
  { id: 63, homeSlot: '3RD_4', awaySlot: '3RD_5' },
  { id: 64, homeSlot: '3RD_6', awaySlot: '3RD_7' },
];

interface RawMatch {
  id: string;
  date: string;
  championship: string;
  team1: string;
  team2: string;
  status: string;
  team1Score?: number;
  team2Score?: number;
}

interface TeamStats {
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'PEN']);

function getFlag(name: string): string {
  return FLAGS[name] || '';
}

function newTeamStats(name: string): TeamStats {
  return { teamName: name, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
}

/** Calcula a tabela de um grupo a partir dos jogos finalizados entre os 4 times do grupo */
function computeGroupTable(teams: string[], matches: RawMatch[]): TeamStats[] {
  const table: Record<string, TeamStats> = {};
  teams.forEach(t => { table[t] = newTeamStats(t); });

  matches.forEach(m => {
    if (m.status !== 'FT') return;
    if (!teams.includes(m.team1) || !teams.includes(m.team2)) return;
    if (m.team1Score === undefined || m.team2Score === undefined) return;

    const h = table[m.team1];
    const a = table[m.team2];
    if (!h || !a) return;

    h.played++; a.played++;
    h.goalsFor += m.team1Score; h.goalsAgainst += m.team2Score;
    a.goalsFor += m.team2Score; a.goalsAgainst += m.team1Score;

    if (m.team1Score > m.team2Score) { h.wins++; h.points += 3; a.losses++; }
    else if (m.team2Score > m.team1Score) { a.wins++; a.points += 3; h.losses++; }
    else { h.draws++; h.points++; a.draws++; a.points++; }
  });

  Object.values(table).forEach(t => { t.goalDifference = t.goalsFor - t.goalsAgainst; });

  return Object.values(table).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName);
  });
}

function resolveSlot(
  slot: string,
  groupTables: Record<string, TeamStats[]>,
  best8Thirds: TeamStats[]
): string {
  if (slot.startsWith('3RD_')) {
    const idx = parseInt(slot.split('_')[1]);
    return best8Thirds[idx]?.teamName || `3º melhor`;
  }
  const match = slot.match(/^([12])([A-L])$/);
  if (!match) return slot;
  const pos = parseInt(match[1]);
  const letter = match[2];
  const table = groupTables[letter];
  return table?.[pos - 1]?.teamName || slot;
}

function SlotCard({ homeTeam, awayTeam, homeScore, awayScore, status, gameId, isResolved }: {
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  gameId: number;
  isResolved: boolean;
}) {
  const isLive    = LIVE_STATUSES.has(status || '');
  const isDone    = status === 'FT';
  const isPending = !isResolved;
  const homeWins  = isDone && (homeScore ?? 0) > (awayScore ?? 0);
  const awayWins  = isDone && (awayScore ?? 0) > (homeScore ?? 0);

  return (
    <div className={`rounded-xl overflow-hidden border transition-all ${
      isLive ? 'border-yellow-500/70 shadow-lg shadow-yellow-900/20' :
      isDone ? 'border-slate-700' : 'border-slate-800'
    }`}>
      {isLive && (
        <div className="bg-yellow-500 px-2.5 py-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
          <span className="text-[9px] font-black text-black uppercase tracking-widest">Ao Vivo</span>
        </div>
      )}
      <div className="px-2.5 pt-1.5 pb-0 text-[9px] text-slate-600 font-bold uppercase tracking-widest">
        Jogo {gameId}
      </div>
      <div className="bg-slate-900 divide-y divide-slate-800/60">
        {[
          { name: homeTeam, score: homeScore, wins: homeWins },
          { name: awayTeam, score: awayScore, wins: awayWins },
        ].map(({ name, score, wins }, i) => (
          <div key={i} className={`flex items-center justify-between px-2.5 py-2 ${wins ? 'bg-yellow-950/30' : ''}`}>
            <div className="flex items-center gap-1.5 min-w-0">
              {getFlag(name) && <span className="text-base leading-none">{getFlag(name)}</span>}
              <span className={`text-xs font-semibold truncate ${
                isPending ? 'text-slate-500 italic' :
                wins ? 'text-yellow-400' : 'text-slate-200'
              }`}>
                {name || 'A definir'}
              </span>
            </div>
            <span className={`text-sm font-black tabular-nums ml-2 shrink-0 ${
              wins ? 'text-yellow-400' :
              isLive ? 'text-white' :
              isDone ? 'text-slate-300' : 'text-slate-700'
            }`}>
              {(isLive || isDone) ? (score ?? 0) : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface RawStandingEntry {
  position: number;
  teamName: string;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

interface RawStandingGroup {
  group: string;
  table: RawStandingEntry[];
}

function normalizeGroupLetter(raw: string): string {
  // ESPN pode retornar "Group A", "A", "GROUP_A" etc.
  const m = raw.match(/([A-L])\s*$/i);
  return m ? m[1].toUpperCase() : raw.trim().toUpperCase();
}

type Phase = 'oitavas32' | 'oitavas' | 'quartas' | 'semi' | 'final';

interface ResolvedSlot {
  id: number;
  home: string;
  away: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  isResolved: boolean;
}

function getWinner(slot: ResolvedSlot): string | null {
  if (slot.status !== 'FT') return null;
  const hs = slot.homeScore ?? 0;
  const as_ = slot.awayScore ?? 0;
  if (hs === as_) return null; // pênaltis não capturados — aguarda dado real
  return hs > as_ ? slot.home : slot.away;
}

export function BracketSection() {
  const [allMatches, setAllMatches]   = useState<RawMatch[]>([]);
  const [realStandings, setRealStandings] = useState<RawStandingGroup[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);
  const [activePhase, setActivePhase] = useState<Phase>('oitavas32');

  useEffect(() => {
    const load = async () => {
      try {
        const [matchesData, standingsData] = await Promise.all([
          api.getByCompetition('World Cup'),
          api.getStandings(),
        ]);
        setAllMatches(matchesData as RawMatch[]);
        setRealStandings((standingsData as RawStandingGroup[]) || []);
        setError(false);
      } catch {
        setError(true);
      }
      setLoading(false);
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  // Fonte primária: standings reais (ESPN/Football-Data). Se vazio, calcula localmente
  // a partir do histórico de jogos como fallback.
  const groupTables: Record<string, TeamStats[]> = {};

  if (realStandings.length > 0) {
    realStandings.forEach(g => {
      const letter = normalizeGroupLetter(g.group);
      groupTables[letter] = g.table
        .map(e => ({
          teamName:       e.teamName,
          played:         e.played,
          wins:           e.wins,
          draws:          e.draws,
          losses:         e.losses,
          goalsFor:       e.goalsFor,
          goalsAgainst:   e.goalsAgainst,
          goalDifference: e.goalDifference,
          points:         e.points,
        }))
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
          return b.goalsFor - a.goalsFor;
        });
    });
  }

  // Preenche grupos faltantes (ou todos, se standings real veio vazio) com cálculo local
  Object.entries(GROUP_TEAMS).forEach(([letter, teams]) => {
    if (!groupTables[letter] || groupTables[letter].length === 0) {
      groupTables[letter] = computeGroupTable(teams, allMatches);
    }
  });

  // Melhores 3ºs lugares — só considera grupos onde os 4 times já jogaram pelo menos 1 jogo
  const allThirds = Object.values(groupTables)
    .map(table => table[2])
    .filter((t): t is TeamStats => !!t && t.played > 0)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  const best8Thirds = allThirds.slice(0, 8);

  // Fase de grupos é considerada completa quando todos os 12 grupos têm
  // todos os 4 times com 3 jogos disputados (3 rodadas da fase de grupos)
  const groupsComplete = Object.values(groupTables).every(
    table => table.every(t => t.played >= 3)
  );

  const groupsStarted = allMatches.some(m => m.status === 'FT');

  // Resolve cada slot do bracket (nome do time, considerando empates de classificação)
  const resolvedSlots = BRACKET_SLOTS.map(slot => {
    const homeResolved = resolveSlot(slot.homeSlot, groupTables, best8Thirds);
    const awayResolved = resolveSlot(slot.awaySlot, groupTables, best8Thirds);

    const homeIsTeamName = !homeResolved.match(/^[12][A-L]$/) && homeResolved !== '3º melhor';
    const awayIsTeamName = !awayResolved.match(/^[12][A-L]$/) && awayResolved !== '3º melhor';
    const isResolved = homeIsTeamName && awayIsTeamName;

    // Procura jogo real no histórico que bata com os dois times resolvidos
    const live = allMatches.find(m =>
      (m.team1 === homeResolved && m.team2 === awayResolved) ||
      (m.team1 === awayResolved && m.team2 === homeResolved)
    );

    return {
      ...slot,
      home:       live ? live.team1 : homeResolved,
      away:       live ? live.team2 : awayResolved,
      homeScore:  live?.team1Score,
      awayScore:  live?.team2Score,
      status:     live?.status,
      isResolved,
    };
  });

  // ── Avanço de fases: Quartas, Semi, Final ──────────────────────────────
  // Cada fase usa os vencedores da fase anterior, em pares consecutivos.
  function buildNextRound(prevSlots: ResolvedSlot[], startId: number): ResolvedSlot[] {
    const pairs: ResolvedSlot[] = [];
    for (let i = 0; i < prevSlots.length; i += 2) {
      const a = prevSlots[i];
      const b = prevSlots[i + 1];
      if (!a || !b) continue;

      const winnerA = getWinner(a);
      const winnerB = getWinner(b);

      const home = winnerA || (a.isResolved ? '' : '');
      const away = winnerB || (b.isResolved ? '' : '');

      // Procura jogo real entre os dois vencedores, se ambos já definidos
      const live = (winnerA && winnerB)
        ? allMatches.find(m =>
            (m.team1 === winnerA && m.team2 === winnerB) ||
            (m.team1 === winnerB && m.team2 === winnerA)
          )
        : undefined;

      pairs.push({
        id:         startId + pairs.length,
        home:       live ? live.team1 : (winnerA || ''),
        away:       live ? live.team2 : (winnerB || ''),
        homeScore:  live?.team1Score,
        awayScore:  live?.team2Score,
        status:     live?.status,
        isResolved: !!(winnerA && winnerB),
      });
    }
    return pairs;
  }

  // Rd. 32 (oitavas oficiais, jogos 49-64) já está em resolvedSlots
  const quarterfinals = buildNextRound(resolvedSlots, 65);   // jogos 65-68
  const semifinals    = buildNextRound(quarterfinals, 69);   // jogos 69-70
  const final          = buildNextRound(semifinals, 71);      // jogo 71

  const liveCount = resolvedSlots.filter(s => LIVE_STATUSES.has(s.status || '')).length
    + quarterfinals.filter(s => LIVE_STATUSES.has(s.status || '')).length
    + semifinals.filter(s => LIVE_STATUSES.has(s.status || '')).length
    + final.filter(s => LIVE_STATUSES.has(s.status || '')).length;

  const PHASES: { key: Phase; label: string; emoji: string }[] = [
    { key: 'oitavas32', label: 'Oitavas',  emoji: '⚔️' },
    { key: 'quartas',   label: 'Quartas',  emoji: '🔥' },
    { key: 'semi',      label: 'Semifinal', emoji: '⚡' },
    { key: 'final',     label: 'Final',    emoji: '🏆' },
  ];

  return (
    <section id="bracket" className="px-4 py-12 border-t border-slate-800/50">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">
              🏆 Chaveamento — Mata-mata
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Copa do Mundo FIFA 2026 · Calculado a partir dos jogos reais
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {liveCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-yellow-400 bg-yellow-950/40 border border-yellow-800/50 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                {liveCount} ao vivo
              </span>
            )}
            {!groupsStarted && (
              <span className="text-xs text-slate-600 bg-slate-800 px-3 py-1.5 rounded-full">
                📋 Fase de grupos ainda não começou
              </span>
            )}
            {groupsStarted && !groupsComplete && (
              <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full">
                📊 Fase de grupos em andamento
              </span>
            )}
            {groupsComplete && (
              <span className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-full">
                ✅ Grupos encerrados
              </span>
            )}
          </div>
        </div>

        {/* Abas de fase */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto scrollbar-hide">
          {PHASES.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => setActivePhase(key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                activePhase === key
                  ? 'bg-yellow-500 text-black'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{emoji}</span>{label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-800/40 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            Não foi possível carregar os jogos da Copa. Tente novamente em instantes.
          </div>
        ) : (
          <>
            {/* Oitavas (Rd. de 32) */}
            {activePhase === 'oitavas32' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {resolvedSlots.map(slot => (
                  <SlotCard
                    key={slot.id}
                    gameId={slot.id}
                    homeTeam={slot.home}
                    awayTeam={slot.away}
                    homeScore={slot.homeScore}
                    awayScore={slot.awayScore}
                    status={slot.status}
                    isResolved={slot.isResolved}
                  />
                ))}
              </div>
            )}

            {/* Quartas de Final */}
            {activePhase === 'quartas' && (
              quarterfinals.some(s => s.isResolved || s.home || s.away) ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {quarterfinals.map(slot => (
                    <SlotCard
                      key={slot.id}
                      gameId={slot.id}
                      homeTeam={slot.home}
                      awayTeam={slot.away}
                      homeScore={slot.homeScore}
                      awayScore={slot.awayScore}
                      status={slot.status}
                      isResolved={slot.isResolved}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <span className="text-5xl">🔥</span>
                  <p className="text-white font-bold text-lg">Quartas de Final</p>
                  <p className="text-slate-500 text-sm max-w-xs">
                    Aguardando o fim das oitavas para definir os confrontos.
                  </p>
                </div>
              )
            )}

            {/* Semifinais */}
            {activePhase === 'semi' && (
              semifinals.some(s => s.isResolved || s.home || s.away) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                  {semifinals.map(slot => (
                    <SlotCard
                      key={slot.id}
                      gameId={slot.id}
                      homeTeam={slot.home}
                      awayTeam={slot.away}
                      homeScore={slot.homeScore}
                      awayScore={slot.awayScore}
                      status={slot.status}
                      isResolved={slot.isResolved}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <span className="text-5xl">⚡</span>
                  <p className="text-white font-bold text-lg">Semifinais</p>
                  <p className="text-slate-500 text-sm max-w-xs">
                    Aguardando o fim das quartas de final.
                  </p>
                </div>
              )
            )}

            {/* Final */}
            {activePhase === 'final' && (
              final.some(s => s.isResolved || s.home || s.away) ? (
                <div className="max-w-sm mx-auto">
                  {final.map(slot => (
                    <SlotCard
                      key={slot.id}
                      gameId={slot.id}
                      homeTeam={slot.home}
                      awayTeam={slot.away}
                      homeScore={slot.homeScore}
                      awayScore={slot.awayScore}
                      status={slot.status}
                      isResolved={slot.isResolved}
                    />
                  ))}
                  {final[0] && getWinner(final[0]) && (
                    <div className="mt-4 text-center bg-gradient-to-r from-yellow-600/20 via-yellow-500/30 to-yellow-600/20 border border-yellow-500/40 rounded-xl py-4">
                      <p className="text-xs text-yellow-400 font-bold uppercase tracking-widest mb-1">Campeão</p>
                      <p className="text-2xl font-black text-white">
                        {getFlag(getWinner(final[0])!)} {getWinner(final[0])}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <span className="text-5xl">🏆</span>
                  <p className="text-white font-bold text-lg">Grande Final</p>
                  <p className="text-slate-500 text-sm max-w-xs">
                    Aguardando o fim das semifinais.
                  </p>
                </div>
              )
            )}

            {/* Status da classificação — só na aba de oitavas e enquanto grupos não terminaram */}
            {activePhase === 'oitavas32' && !groupsComplete && (
              <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-xs font-black text-yellow-400 uppercase tracking-widest mb-3">
                  Classificação por grupo
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {Object.entries(groupTables).map(([letter, table]) => {
                    const allPlayed = table.every(t => t.played >= 3);
                    return (
                      <div key={letter} className="bg-slate-800/50 rounded-lg p-2.5">
                        <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-1.5">
                          Grupo {letter}
                        </p>
                        {table.slice(0, 2).map((t, i) => (
                          <div key={i} className="flex items-center gap-1.5 py-0.5">
                            <span className={`text-[10px] font-black w-3 ${allPlayed ? 'text-emerald-400' : 'text-slate-600'}`}>
                              {i + 1}
                            </span>
                            <span className="text-sm">{getFlag(t.teamName)}</span>
                            <span className={`text-[11px] font-semibold truncate ${t.played > 0 ? 'text-white' : 'text-slate-500'}`}>
                              {t.teamName}
                            </span>
                            <span className="ml-auto text-[10px] font-black text-yellow-500">{t.points}pts</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                {/* Melhores 3ºs */}
                {allThirds.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Melhores 3ºs lugares — top 8 avançam ({allThirds.length}/12 grupos com dados)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {allThirds.map((t, i) => (
                        <div key={i} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold ${
                          i < 8 ? 'bg-yellow-950/40 border border-yellow-800/30 text-yellow-300' : 'bg-slate-800 text-slate-500'
                        }`}>
                          <span>{getFlag(t.teamName)}</span>
                          <span>{t.teamName}</span>
                          <span className="text-[10px] font-black ml-1">{t.points}pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Legenda */}
        <div className="mt-4 flex items-center gap-4 text-xs text-slate-600 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-500/80" />
            <span>Vencedor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span>Ao vivo agora</span>
          </div>
          <div className="flex items-center gap-1.5 italic text-slate-700">
            <span>1A / 2B = Classificado do grupo (a definir)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
