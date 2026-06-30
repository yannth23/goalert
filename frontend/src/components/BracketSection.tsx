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
  'United States': '🇺🇸', 'USA': '🇺🇸', 'EUA': '🇺🇸', 'Estados Unidos': '🇺🇸',
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
  'Curaçao': '🇨🇼', 'Curaçau': '🇨🇼',
  'Cabo Verde': '🇨🇻', 'Cape Verde': '🇨🇻',
  'Iraq': '🇮🇶', 'Iraque': '🇮🇶',
  'Algeria': '🇩🇿', 'Argélia': '🇩🇿',
  'Czechia': '🇨🇿', 'Czech Republic': '🇨🇿', 'Tchéquia': '🇨🇿',
  'Haiti': '🇭🇹',
  'Azerbaijan': '🇦🇿', 'Azerbaijão': '🇦🇿',
  'South Africa': '🇿🇦', 'África do Sul': '🇿🇦',
  'Bosnia and Herzegovina': '🇧🇦', 'Bosnia-Herzegovina': '🇧🇦', 'Bósnia e Herzegovina': '🇧🇦',
  'New Zealand': '🇳🇿', 'Nova Zelândia': '🇳🇿',
  'Egypt': '🇪🇬', 'Egito': '🇪🇬',
  'Jordan': '🇯🇴', 'Jordânia': '🇯🇴',
  'Congo DR': '🇨🇩', 'DR Congo': '🇨🇩', 'RD Congo': '🇨🇩',
  'Uzbekistan': '🇺🇿', 'Uzbequistão': '🇺🇿',
};

// Composição OFICIAL dos 12 grupos da Copa do Mundo FIFA 2026 (sorteio de 5 dez 2025)
// Composição oficial dos 12 grupos — nomes em português, iguais ao que o
// backend salva via translateTeam() (translation.util.ts).
const GROUP_TEAMS: Record<string, string[]> = {
  'A': ['México', 'África do Sul', 'Coreia do Sul', 'Tchéquia'],
  'B': ['Canadá', 'Bósnia e Herzegovina', 'Catar', 'Suíça'],
  'C': ['Brasil', 'Marrocos', 'Haiti', 'Escócia'],
  'D': ['Estados Unidos', 'Paraguai', 'Austrália', 'Turquia'],
  'E': ['Alemanha', 'Curaçao', 'Costa do Marfim', 'Equador'],
  'F': ['Holanda', 'Japão', 'Suécia', 'Tunísia'],
  'G': ['Bélgica', 'Egito', 'Irã', 'Nova Zelândia'],
  'H': ['Espanha', 'Cabo Verde', 'Arábia Saudita', 'Uruguai'],
  'I': ['França', 'Senegal', 'Iraque', 'Noruega'],
  'J': ['Argentina', 'Argélia', 'Áustria', 'Jordânia'],
  'K': ['Portugal', 'RD Congo', 'Uzbequistão', 'Colômbia'],
  'L': ['Inglaterra', 'Croácia', 'Gana', 'Panamá'],
};

// Round of 32 oficial — 16 jogos (FIFA match 73-88).
// Tipos: (a) 1º vs 2º de outro grupo; (b) 1º vs melhor 3º; (c) 2º vs 2º.
// Fonte: fixture oficial FIFA divulgado após o sorteio.
const ROUND_OF_32: { id: number; homeSlot: string; awaySlot: string }[] = [
  { id: 73, homeSlot: '1A', awaySlot: '2B' },
  { id: 74, homeSlot: '1E', awaySlot: '3D|F|G' },  // Germany vs Paraguay (3rd)
  { id: 75, homeSlot: '1F', awaySlot: '2C' },       // Netherlands vs Morocco
  { id: 76, homeSlot: '1C', awaySlot: '2F' },       // Brazil vs Japan
  { id: 77, homeSlot: '2E', awaySlot: '2I' },       // Ivory Coast vs Norway
  { id: 78, homeSlot: '1I', awaySlot: '3D|E|F' },   // France vs Sweden (3rd)
  { id: 79, homeSlot: '1A', awaySlot: '3D|E|I' },   // Mexico vs Ecuador (3rd)
  { id: 80, homeSlot: '1L', awaySlot: '3I|J|K' },   // England vs DR Congo (3rd)
  { id: 81, homeSlot: '1G', awaySlot: '3F|H|I' },   // Belgium vs Senegal (3rd)
  { id: 82, homeSlot: '1D', awaySlot: '3B|F|G' },   // USA vs Bosnia (3rd)
  { id: 83, homeSlot: '1H', awaySlot: '2J' },        // Spain vs Austria
  { id: 84, homeSlot: '1B', awaySlot: '3A|J|K' },   // Switzerland vs Algeria (3rd)
  { id: 85, homeSlot: '2K', awaySlot: '2L' },        // Portugal-runner vs Croatia(runner) — actually 2K vs 2L
  { id: 86, homeSlot: '2D', awaySlot: '2G' },        // Australia vs Egypt
  { id: 87, homeSlot: '1J', awaySlot: '2H' },        // Argentina vs Cabo Verde
  { id: 88, homeSlot: '1K', awaySlot: '3E|H|L' },   // Colombia vs Ghana (3rd)
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

interface ResolvedSlot {
  id: number;
  home: string;
  away: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  isResolved: boolean;
}

type Phase = 'r32' | 'r16' | 'quartas' | 'semi' | 'final';

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'PEN']);

function getFlag(name: string): string {
  return FLAGS[name] || '';
}

function newTeamStats(name: string): TeamStats {
  return { teamName: name, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
}

function normalizeGroupLetter(raw: string): string {
  const m = raw.match(/([A-L])\s*$/i);
  return m ? m[1].toUpperCase() : raw.trim().toUpperCase();
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

/**
 * Resolve um slot do bracket para o nome do time.
 * Slots como "1A"/"2B" apontam direto pra posição do grupo.
 * Slots como "3D|F|G" (melhor 3º entre D, F, G) usam o ranking de 3ºs lugares —
 * aqui simplificamos pegando o próximo 3º disponível na fila geral dos 8 melhores,
 * já que a tabela oficial de combinação (495 cenários) é complexa demais pra replicar 1:1
 * sem a definição final dos grupos classificados.
 */
function resolveSlot(
  slot: string,
  groupTables: Record<string, TeamStats[]>,
  best8Thirds: TeamStats[],
  usedThirds: Set<string>
): string {
  const directMatch = slot.match(/^([12])([A-L])$/);
  if (directMatch) {
    const pos = parseInt(directMatch[1]);
    const letter = directMatch[2];
    return groupTables[letter]?.[pos - 1]?.teamName || slot;
  }
  if (slot.startsWith('3')) {
    const next = best8Thirds.find(t => !usedThirds.has(t.teamName));
    if (next) { usedThirds.add(next.teamName); return next.teamName; }
    return `3º melhor`;
  }
  return slot;
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

function getWinner(slot: ResolvedSlot): string | null {
  if (slot.status !== 'FT') return null;
  const hs = slot.homeScore ?? 0;
  const as_ = slot.awayScore ?? 0;
  if (hs === as_) return null;
  return hs > as_ ? slot.home : slot.away;
}

export function BracketSection() {
  const [allMatches, setAllMatches]       = useState<RawMatch[]>([]);
  const [realStandings, setRealStandings] = useState<RawStandingGroup[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(false);
  const [activePhase, setActivePhase]     = useState<Phase>('r32');

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

  // Fonte primária: standings reais (ESPN). Fallback: cálculo local pelo histórico de jogos.
  const groupTables: Record<string, TeamStats[]> = {};

  if (realStandings.length > 0) {
    realStandings.forEach(g => {
      const letter = normalizeGroupLetter(g.group);
      groupTables[letter] = g.table
        .map(e => ({
          teamName: e.teamName, played: e.played, wins: e.wins, draws: e.draws, losses: e.losses,
          goalsFor: e.goalsFor, goalsAgainst: e.goalsAgainst, goalDifference: e.goalDifference, points: e.points,
        }))
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
          return b.goalsFor - a.goalsFor;
        });
    });
  }

  Object.entries(GROUP_TEAMS).forEach(([letter, teams]) => {
    if (!groupTables[letter] || groupTables[letter].length === 0) {
      groupTables[letter] = computeGroupTable(teams, allMatches);
    }
  });

  const allThirds = Object.values(groupTables)
    .map(table => table[2])
    .filter((t): t is TeamStats => !!t && t.played > 0)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  const best8Thirds = allThirds.slice(0, 8);

  const groupsComplete = Object.values(groupTables).every(table => table.every(t => t.played >= 3));
  const groupsStarted  = allMatches.some(m => m.status === 'FT');

  const usedThirds = new Set<string>();
  const resolvedSlots: ResolvedSlot[] = ROUND_OF_32.map(slot => {
    const homeResolved = resolveSlot(slot.homeSlot, groupTables, best8Thirds, usedThirds);
    const awayResolved = resolveSlot(slot.awaySlot, groupTables, best8Thirds, usedThirds);

    const homeIsTeam = !homeResolved.match(/^[12][A-L]$/) && homeResolved !== '3º melhor';
    const awayIsTeam = !awayResolved.match(/^[12][A-L]$/) && awayResolved !== '3º melhor';
    const isResolved = homeIsTeam && awayIsTeam;

    const live = allMatches.find(m =>
      (m.team1 === homeResolved && m.team2 === awayResolved) ||
      (m.team1 === awayResolved && m.team2 === homeResolved)
    );

    return {
      id:         slot.id,
      home:       live ? live.team1 : homeResolved,
      away:       live ? live.team2 : awayResolved,
      homeScore:  live?.team1Score,
      awayScore:  live?.team2Score,
      status:     live?.status,
      isResolved,
    };
  });

  function buildNextRound(prevSlots: ResolvedSlot[], startId: number): ResolvedSlot[] {
    const next: ResolvedSlot[] = [];
    for (let i = 0; i < prevSlots.length; i += 2) {
      const a = prevSlots[i];
      const b = prevSlots[i + 1];
      if (!a || !b) continue;

      const winnerA = getWinner(a);
      const winnerB = getWinner(b);

      const live = (winnerA && winnerB)
        ? allMatches.find(m =>
            (m.team1 === winnerA && m.team2 === winnerB) ||
            (m.team1 === winnerB && m.team2 === winnerA)
          )
        : undefined;

      next.push({
        id:         startId + next.length,
        home:       live ? live.team1 : (winnerA || ''),
        away:       live ? live.team2 : (winnerB || ''),
        homeScore:  live?.team1Score,
        awayScore:  live?.team2Score,
        status:     live?.status,
        isResolved: !!(winnerA && winnerB),
      });
    }
    return next;
  }

  const roundOf16   = buildNextRound(resolvedSlots, 89);  // jogos 89-96
  const quarterfinals = buildNextRound(roundOf16, 97);     // jogos 97-100
  const semifinals    = buildNextRound(quarterfinals, 101); // jogos 101-102
  const final          = buildNextRound(semifinals, 104);   // jogo 104

  const liveCount =
    resolvedSlots.filter(s => LIVE_STATUSES.has(s.status || '')).length +
    roundOf16.filter(s => LIVE_STATUSES.has(s.status || '')).length +
    quarterfinals.filter(s => LIVE_STATUSES.has(s.status || '')).length +
    semifinals.filter(s => LIVE_STATUSES.has(s.status || '')).length +
    final.filter(s => LIVE_STATUSES.has(s.status || '')).length;

  const PHASES: { key: Phase; label: string; emoji: string }[] = [
    { key: 'r32',     label: 'Rd. de 32', emoji: '⚔️' },
    { key: 'r16',     label: 'Oitavas',   emoji: '🎯' },
    { key: 'quartas', label: 'Quartas',   emoji: '🔥' },
    { key: 'semi',    label: 'Semifinal', emoji: '⚡' },
    { key: 'final',   label: 'Final',     emoji: '🏆' },
  ];

  function renderPhase(slots: ResolvedSlot[], emptyIcon: string, emptyTitle: string, emptyDesc: string, gridCols: string) {
    const hasContent = slots.some(s => s.isResolved || s.home || s.away);
    if (!hasContent) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <span className="text-5xl">{emptyIcon}</span>
          <p className="text-white font-bold text-lg">{emptyTitle}</p>
          <p className="text-slate-500 text-sm max-w-xs">{emptyDesc}</p>
        </div>
      );
    }
    return (
      <div className={`grid ${gridCols} gap-3`}>
        {slots.map(slot => (
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
    );
  }

  return (
    <section id="bracket" className="px-4 py-12 border-t border-slate-800/50">
      <div className="max-w-6xl mx-auto">

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">
              🏆 Chaveamento — Mata-mata
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Copa do Mundo FIFA 2026 · 12 grupos → Rd. de 32 → Final
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
              <span className="text-xs text-slate-600 bg-slate-800 px-3 py-1.5 rounded-full">📋 Grupos ainda não começaram</span>
            )}
            {groupsStarted && !groupsComplete && (
              <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full">📊 Fase de grupos em andamento</span>
            )}
            {groupsComplete && (
              <span className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-full">✅ Grupos encerrados</span>
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
                activePhase === key ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-400 hover:text-white'
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
            {activePhase === 'r32' && renderPhase(
              resolvedSlots, '⚔️', 'Rd. de 32',
              'Confrontos definidos pelos classificados de cada grupo + 8 melhores 3ºs lugares.',
              'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
            )}
            {activePhase === 'r16' && renderPhase(
              roundOf16, '🎯', 'Oitavas de Final',
              'Aguardando o fim da Rd. de 32 para definir os confrontos.',
              'grid-cols-2 sm:grid-cols-4'
            )}
            {activePhase === 'quartas' && renderPhase(
              quarterfinals, '🔥', 'Quartas de Final',
              'Aguardando o fim das oitavas.',
              'grid-cols-2 sm:grid-cols-4'
            )}
            {activePhase === 'semi' && renderPhase(
              semifinals, '⚡', 'Semifinais',
              'Aguardando o fim das quartas de final.',
              'grid-cols-1 sm:grid-cols-2 max-w-xl mx-auto'
            )}
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
                  <p className="text-slate-500 text-sm max-w-xs">Aguardando o fim das semifinais.</p>
                </div>
              )
            )}

            {activePhase === 'r32' && !groupsComplete && (
              <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-xs font-black text-yellow-400 uppercase tracking-widest mb-3">Classificação por grupo</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {Object.entries(groupTables).map(([letter, table]) => {
                    const allPlayed = table.every(t => t.played >= 3);
                    return (
                      <div key={letter} className="bg-slate-800/50 rounded-lg p-2.5">
                        <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-1.5">Grupo {letter}</p>
                        {table.slice(0, 2).map((t, i) => (
                          <div key={i} className="flex items-center gap-1.5 py-0.5">
                            <span className={`text-[10px] font-black w-3 ${allPlayed ? 'text-emerald-400' : 'text-slate-600'}`}>{i + 1}</span>
                            <span className="text-sm">{getFlag(t.teamName)}</span>
                            <span className={`text-[11px] font-semibold truncate ${t.played > 0 ? 'text-white' : 'text-slate-500'}`}>{t.teamName}</span>
                            <span className="ml-auto text-[10px] font-black text-yellow-500">{t.points}pts</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

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
