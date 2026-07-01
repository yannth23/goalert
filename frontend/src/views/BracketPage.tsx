'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const FLAGS: Record<string, string> = {
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
  'Paraguai': '🇵🇾', 'Bolívia': '🇧🇴', 'Curaçao': '🇨🇼', 'Cabo Verde': '🇨🇻',
  'África do Sul': '🇿🇦', 'Tchéquia': '🇨🇿', 'Bósnia e Herzegovina': '🇧🇦',
  'Tunísia': '🇹🇳', 'Egito': '🇪🇬', 'Nova Zelândia': '🇳🇿', 'Iraque': '🇮🇶',
  'Argélia': '🇩🇿', 'Jordânia': '🇯🇴', 'RD Congo': '🇨🇩', 'Uzbequistão': '🇺🇿',
  // Variações em inglês
  'Brazil': '🇧🇷', 'France': '🇫🇷', 'Germany': '🇩🇪', 'Spain': '🇪🇸',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Italy': '🇮🇹', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪',
  'Uruguay': '🇺🇾', 'Croatia': '🇭🇷', 'Morocco': '🇲🇦', 'South Korea': '🇰🇷',
  'United States': '🇺🇸', 'USA': '🇺🇸', 'Mexico': '🇲🇽', 'Senegal': '🇸🇳',
  'Ecuador': '🇪🇨', 'Colombia': '🇨🇴', 'Switzerland': '🇨🇭', 'Denmark': '🇩🇰',
  'Poland': '🇵🇱', 'Australia': '🇦🇺', 'Qatar': '🇶🇦', 'Saudi Arabia': '🇸🇦',
  'Iran': '🇮🇷', 'Turkey': '🇹🇷', 'Türkiye': '🇹🇷', 'Ukraine': '🇺🇦',
  'Austria': '🇦🇹', 'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Serbia': '🇷🇸',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Ivory Coast': '🇨🇮', 'Nigeria': '🇳🇬', 'Ghana': '🇬🇭',
  'Cameroon': '🇨🇲', 'Panama': '🇵🇦', 'Paraguay': '🇵🇾', 'Bolivia': '🇧🇴',
  'Curaçau': '🇨🇼', 'Cape Verde': '🇨🇻', 'South Africa': '🇿🇦',
  'Czech Republic': '🇨🇿', 'Czechia': '🇨🇿', 'Bosnia-Herzegovina': '🇧🇦',
  'Bosnia and Herzegovina': '🇧🇦', 'Tunisia': '🇹🇳', 'Egypt': '🇪🇬',
  'New Zealand': '🇳🇿', 'Iraq': '🇮🇶', 'Algeria': '🇩🇿', 'Jordan': '🇯🇴',
  'DR Congo': '🇨🇩', 'Congo DR': '🇨🇩', 'Uzbekistan': '🇺🇿',
};

// Composição OFICIAL dos 12 grupos da Copa do Mundo FIFA 2026 (sorteio de 5 dez 2025)
const GROUPS: Record<string, string[]> = {
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

// Round of 32 OFICIAL FIFA — 16 jogos (match 73-88)
const ROUND_OF_32: { id: number; homeSlot: string; awaySlot: string }[] = [
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

// Round of 16 OFICIAL — usa vencedores específicos do R32
const ROUND_OF_16_PAIRS: [number, number][] = [
  [73, 75], [74, 77], [76, 78], [79, 80],
  [81, 82], [83, 84], [86, 88], [85, 87],
];

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  team1Score?: number;
  team2Score?: number;
  status: string;
  date: string;
  championship: string;
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

interface KnockoutMatch {
  home: string;
  away: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  gameId: number;
  isResolved: boolean;
}

function newTeamStats(name: string): TeamStats {
  return { teamName: name, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
}

function getFlag(name: string): string {
  return FLAGS[name] || '';
}

function computeGroupTable(teams: string[], matches: Match[]): TeamStats[] {
  const table: Record<string, TeamStats> = {};
  teams.forEach(t => { table[t] = newTeamStats(t); });

  matches.forEach(m => {
    if (m.status !== 'FT') return;
    if (!teams.includes(m.homeTeam) || !teams.includes(m.awayTeam)) return;
    if (m.team1Score === undefined || m.team2Score === undefined) return;

    const h = table[m.homeTeam];
    const a = table[m.awayTeam];
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
    const eligibleLetters = slot.slice(1).split('');
    const candidate = best8Thirds.find(t =>
      !usedThirds.has(t.teamName) &&
      eligibleLetters.some(letter => groupTables[letter]?.[2]?.teamName === t.teamName)
    );
    if (candidate) { usedThirds.add(candidate.teamName); return candidate.teamName; }
    return `3º melhor`;
  }
  return slot;
}

function getWinner(slot: KnockoutMatch): string | null {
  if (slot.status !== 'FT') return null;
  const hs = slot.homeScore ?? 0;
  const as_ = slot.awayScore ?? 0;
  if (hs === as_) return null;
  return hs > as_ ? slot.home : slot.away;
}

function KnockoutCard({ match }: { match: KnockoutMatch }) {
  const isLive = match.status === '1H' || match.status === 'HT' || match.status === '2H' || match.status === 'ET' || match.status === 'PEN';
  const isDone = match.status === 'FT';
  const homeWins = isDone && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWins = isDone && (match.awayScore ?? 0) > (match.homeScore ?? 0);
  const isPending = !match.isResolved;

  return (
    <div className={`rounded-xl overflow-hidden border transition-all ${
      isLive ? 'border-yellow-500/70 shadow-lg shadow-yellow-900/20' :
      isDone ? 'border-slate-700' : 'border-slate-800'
    }`} style={{ minWidth: 160 }}>
      {isLive && (
        <div className="bg-yellow-500 px-2 py-0.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
          <span className="text-[9px] font-black text-black uppercase tracking-wider">Ao Vivo</span>
        </div>
      )}
      <div className="px-2.5 pt-1.5 pb-0 text-[9px] text-slate-600 font-bold uppercase tracking-widest">
        Jogo {match.gameId}
      </div>
      <div className="bg-slate-900 divide-y divide-slate-800/60">
        {[
          { name: match.home, score: match.homeScore, wins: homeWins },
          { name: match.away, score: match.awayScore, wins: awayWins },
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

function GroupTable({ name, teams, matches }: {
  name: string;
  teams: string[];
  matches: Match[];
}) {
  const table = computeGroupTable(teams, matches);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-3 py-2 flex items-center gap-2">
        <span className="text-xs font-black text-yellow-400 tracking-widest">GRUPO {name}</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="text-left px-2 py-1.5 text-slate-500 font-medium w-full">Seleção</th>
            <th className="px-1.5 py-1.5 text-slate-500 font-medium text-center">P</th>
            <th className="px-1.5 py-1.5 text-slate-500 font-medium text-center">V</th>
            <th className="px-1.5 py-1.5 text-slate-500 font-medium text-center">E</th>
            <th className="px-1.5 py-1.5 text-slate-500 font-medium text-center">D</th>
            <th className="px-1.5 py-1.5 text-slate-500 font-medium text-center">SG</th>
            <th className="px-1.5 py-1.5 text-yellow-400 font-black text-center">Pts</th>
          </tr>
        </thead>
        <tbody>
          {table.map((t, i) => {
            const qualifies = i < 2;
            return (
              <tr key={t.teamName} className={`border-b border-slate-800/50 last:border-0 ${qualifies ? 'bg-emerald-950/20' : ''}`}>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-black w-4 ${qualifies ? 'text-emerald-400' : 'text-slate-600'}`}>{i + 1}</span>
                    <span className="text-sm">{getFlag(t.teamName)}</span>
                    <span className={`font-semibold ${qualifies ? 'text-white' : 'text-slate-400'}`}>{t.teamName}</span>
                  </div>
                </td>
                <td className="px-1.5 py-1.5 text-center text-slate-400">{t.played}</td>
                <td className="px-1.5 py-1.5 text-center text-slate-400">{t.wins}</td>
                <td className="px-1.5 py-1.5 text-center text-slate-400">{t.draws}</td>
                <td className="px-1.5 py-1.5 text-center text-slate-400">{t.losses}</td>
                <td className="px-1.5 py-1.5 text-center text-slate-400">{t.goalDifference >= 0 ? '+' : ''}{t.goalDifference}</td>
                <td className="px-1.5 py-1.5 text-center font-black text-white">{t.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function BracketPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'grupos' | 'bracket'>('grupos');
  const [activePhase, setActivePhase] = useState<'r32' | 'r16' | 'quartas' | 'semi' | 'final'>('r32');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getByCompetition('World Cup');
        setMatches(data.map(m => ({
          id: m.id,
          homeTeam: m.team1,
          awayTeam: m.team2,
          team1Score: m.team1Score,
          team2Score: m.team2Score,
          status: m.status,
          date: m.date,
          championship: m.championship,
        })) as Match[]);
      } catch {}
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  // Calcula tabelas dos grupos
  const groupTables: Record<string, TeamStats[]> = {};
  Object.entries(GROUPS).forEach(([letter, teams]) => {
    groupTables[letter] = computeGroupTable(teams, matches);
  });

  // Melhores 3ºs lugares
  const allThirds = Object.values(groupTables)
    .map(table => table[2])
    .filter((t): t is TeamStats => !!t && t.played > 0)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  const best8Thirds = allThirds.slice(0, 8);

  // Resolve Round of 32
  const usedThirds = new Set<string>();
  const roundOf32: KnockoutMatch[] = ROUND_OF_32.map(slot => {
    const homeResolved = resolveSlot(slot.homeSlot, groupTables, best8Thirds, usedThirds);
    const awayResolved = resolveSlot(slot.awaySlot, groupTables, best8Thirds, usedThirds);

    const homeIsTeam = !homeResolved.match(/^[12][A-L]$/) && homeResolved !== '3º melhor';
    const awayIsTeam = !awayResolved.match(/^[12][A-L]$/) && awayResolved !== '3º melhor';
    const isResolved = homeIsTeam && awayIsTeam;

    // Busca jogo real entre esses times
    const live = matches.find(m =>
      (m.homeTeam === homeResolved && m.awayTeam === awayResolved) ||
      (m.homeTeam === awayResolved && m.awayTeam === homeResolved)
    );

    return {
      home: live ? live.homeTeam : homeResolved,
      away: live ? live.awayTeam : awayResolved,
      homeScore: live?.team1Score,
      awayScore: live?.team2Score,
      status: live?.status,
      gameId: slot.id,
      isResolved,
    };
  });

  // Round of 16
  const slotById = new Map(roundOf32.map(s => [s.gameId, s]));
  const roundOf16: KnockoutMatch[] = ROUND_OF_16_PAIRS.map(([idA, idB], i) => {
    const a = slotById.get(idA);
    const b = slotById.get(idB);
    if (!a || !b) return { home: '', away: '', gameId: 89 + i, isResolved: false };

    const winnerA = getWinner(a);
    const winnerB = getWinner(b);

    const live = (winnerA && winnerB)
      ? matches.find(m =>
          (m.homeTeam === winnerA && m.awayTeam === winnerB) ||
          (m.homeTeam === winnerB && m.awayTeam === winnerA)
        )
      : undefined;

    return {
      home: live ? live.homeTeam : (winnerA || `Venc. Jogo ${idA}`),
      away: live ? live.awayTeam : (winnerB || `Venc. Jogo ${idB}`),
      homeScore: live?.team1Score,
      awayScore: live?.team2Score,
      status: live?.status,
      gameId: 89 + i,
      isResolved: !!(winnerA && winnerB),
    };
  });

  // Quartas
  const quarterfinals: KnockoutMatch[] = [];
  for (let i = 0; i < roundOf16.length; i += 2) {
    const a = roundOf16[i];
    const b = roundOf16[i + 1];
    if (!a || !b) continue;

    const winnerA = getWinner(a);
    const winnerB = getWinner(b);

    const live = (winnerA && winnerB)
      ? matches.find(m =>
          (m.homeTeam === winnerA && m.awayTeam === winnerB) ||
          (m.homeTeam === winnerB && m.awayTeam === winnerA)
        )
      : undefined;

    quarterfinals.push({
      home: live ? live.homeTeam : (winnerA || ''),
      away: live ? live.awayTeam : (winnerB || ''),
      homeScore: live?.team1Score,
      awayScore: live?.team2Score,
      status: live?.status,
      gameId: 97 + quarterfinals.length,
      isResolved: !!(winnerA && winnerB),
    });
  }

  // Semi
  const semifinals: KnockoutMatch[] = [];
  for (let i = 0; i < quarterfinals.length; i += 2) {
    const a = quarterfinals[i];
    const b = quarterfinals[i + 1];
    if (!a || !b) continue;

    const winnerA = getWinner(a);
    const winnerB = getWinner(b);

    const live = (winnerA && winnerB)
      ? matches.find(m =>
          (m.homeTeam === winnerA && m.awayTeam === winnerB) ||
          (m.homeTeam === winnerB && m.awayTeam === winnerA)
        )
      : undefined;

    semifinals.push({
      home: live ? live.homeTeam : (winnerA || ''),
      away: live ? live.awayTeam : (winnerB || ''),
      homeScore: live?.team1Score,
      awayScore: live?.team2Score,
      status: live?.status,
      gameId: 101 + semifinals.length,
      isResolved: !!(winnerA && winnerB),
    });
  }

  // Final
  const finalMatch: KnockoutMatch[] = [];
  if (semifinals.length >= 2) {
    const a = semifinals[0];
    const b = semifinals[1];

    const winnerA = getWinner(a);
    const winnerB = getWinner(b);

    const live = (winnerA && winnerB)
      ? matches.find(m =>
          (m.homeTeam === winnerA && m.awayTeam === winnerB) ||
          (m.homeTeam === winnerB && m.awayTeam === winnerA)
        )
      : undefined;

    finalMatch.push({
      home: live ? live.homeTeam : (winnerA || ''),
      away: live ? live.awayTeam : (winnerB || ''),
      homeScore: live?.team1Score,
      awayScore: live?.team2Score,
      status: live?.status,
      gameId: 104,
      isResolved: !!(winnerA && winnerB),
    });
  }

  const groupsComplete = Object.values(groupTables).every(table => table.every(t => t.played >= 3));

  const PHASES = [
    { key: 'r32', label: 'Rd. de 32' },
    { key: 'r16', label: 'Oitavas' },
    { key: 'quartas', label: 'Quartas' },
    { key: 'semi', label: 'Semifinal' },
    { key: 'final', label: 'Final' },
  ] as const;

  const renderPhase = (slots: KnockoutMatch[], emptyTitle: string, emptyDesc: string, gridCols: string) => {
    const hasContent = slots.some(s => s.isResolved || s.home || s.away);
    if (!hasContent) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <span className="text-5xl">🏆</span>
          <p className="text-white font-bold text-lg">{emptyTitle}</p>
          <p className="text-slate-500 text-sm max-w-xs">{emptyDesc}</p>
        </div>
      );
    }
    return (
      <div className={`grid ${gridCols} gap-3`}>
        {slots.map(slot => (
          <KnockoutCard key={slot.gameId} match={slot} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
        {[
          { key: 'grupos', label: '📋 Grupos' },
          { key: 'bracket', label: '🏆 Chaveamento' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as 'grupos' | 'bracket')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === key
                ? 'bg-yellow-500 text-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* GRUPOS */}
      {activeTab === 'grupos' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Object.entries(GROUPS).map(([name, teams]) => (
            <GroupTable
              key={name}
              name={name}
              teams={[...teams]}
              matches={matches.filter(m =>
                teams.includes(m.homeTeam) && teams.includes(m.awayTeam)
              )}
            />
          ))}
        </div>
      )}

      {/* CHAVEAMENTO */}
      {activeTab === 'bracket' && (
        <div>
          {/* Abas de fase */}
          <div className="flex gap-1.5 mb-6 overflow-x-auto">
            {PHASES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActivePhase(key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activePhase === key ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {!groupsComplete && (
            <div className="mb-4 bg-slate-900 border border-slate-800 rounded-xl p-3">
              <p className="text-xs text-slate-400">
                📊 Fase de grupos em andamento — os confrontos do mata-mata serão definidos quando todos os grupos terminarem.
              </p>
            </div>
          )}

          {activePhase === 'r32' && renderPhase(
            roundOf32, 'Round of 32',
            'Confrontos definidos pelos classificados de cada grupo + 8 melhores 3ºs lugares.',
            'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
          )}
          {activePhase === 'r16' && renderPhase(
            roundOf16, 'Oitavas de Final',
            'Aguardando o fim da Rd. de 32 para definir os confrontos.',
            'grid-cols-2 sm:grid-cols-4'
          )}
          {activePhase === 'quartas' && renderPhase(
            quarterfinals, 'Quartas de Final',
            'Aguardando o fim das oitavas.',
            'grid-cols-2 sm:grid-cols-4'
          )}
          {activePhase === 'semi' && renderPhase(
            semifinals, 'Semifinais',
            'Aguardando o fim das quartas de final.',
            'grid-cols-1 sm:grid-cols-2 max-w-xl mx-auto'
          )}
          {activePhase === 'final' && (
            finalMatch.length > 0 && (finalMatch[0].isResolved || finalMatch[0].home || finalMatch[0].away) ? (
              <div className="max-w-sm mx-auto">
                {finalMatch.map(slot => (
                  <KnockoutCard key={slot.gameId} match={slot} />
                ))}
                {finalMatch[0] && getWinner(finalMatch[0]) && (
                  <div className="mt-4 text-center bg-gradient-to-r from-yellow-600/20 via-yellow-500/30 to-yellow-600/20 border border-yellow-500/40 rounded-xl py-4">
                    <p className="text-xs text-yellow-400 font-bold uppercase tracking-widest mb-1">Campeão</p>
                    <p className="text-2xl font-black text-white">
                      {getFlag(getWinner(finalMatch[0])!)} {getWinner(finalMatch[0])}
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
        </div>
      )}
    </div>
  );
}
