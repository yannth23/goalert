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

interface TeamEntry {
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

interface GroupStanding {
  group: string;
  table: TeamEntry[];
}

interface LiveMatch {
  homeTeam: string;
  awayTeam: string;
  team1Score?: number;
  team2Score?: number;
  status: string;
}

// Copa 2026: chaveamento oficial das oitavas
// 1º e 2º de cada grupo + 8 melhores 3ºs lugares
// Grupos A-L, chaveamento:
// Jogo 49: 1A vs 2B | Jogo 50: 1C vs 2D | Jogo 51: 1E vs 2F
// Jogo 52: 1G vs 2H | Jogo 53: 1I vs 2J | Jogo 54: 1K vs 2L
// Jogo 55: 1B vs 2A | Jogo 56: 1D vs 2C | Jogo 57: 1F vs 2E
// Jogo 58: 1H vs 2G | Jogo 59: 1J vs 2I | Jogo 60: 1L vs 2K
// Jogos 61-64: melhores 3ºs
const BRACKET_SLOTS = [
  { id: 49,  homeSlot: '1A', awaySlot: '2B' },
  { id: 50,  homeSlot: '1C', awaySlot: '2D' },
  { id: 51,  homeSlot: '1E', awaySlot: '2F' },
  { id: 52,  homeSlot: '1G', awaySlot: '2H' },
  { id: 53,  homeSlot: '1I', awaySlot: '2J' },
  { id: 54,  homeSlot: '1K', awaySlot: '2L' },
  { id: 55,  homeSlot: '1B', awaySlot: '2A' },
  { id: 56,  homeSlot: '1D', awaySlot: '2C' },
  { id: 57,  homeSlot: '1F', awaySlot: '2E' },
  { id: 58,  homeSlot: '1H', awaySlot: '2G' },
  { id: 59,  homeSlot: '1J', awaySlot: '2I' },
  { id: 60,  homeSlot: '1L', awaySlot: '2K' },
  { id: 61,  homeSlot: '3° melhor', awaySlot: '3° melhor' },
  { id: 62,  homeSlot: '3° melhor', awaySlot: '3° melhor' },
  { id: 63,  homeSlot: '3° melhor', awaySlot: '3° melhor' },
  { id: 64,  homeSlot: '3° melhor', awaySlot: '3° melhor' },
];

function getFlag(name: string): string {
  return FLAGS[name] || '';
}

function getGroupLetter(groupStr: string): string {
  return groupStr.replace('GROUP_', '').replace('Grupo ', '').trim();
}

function resolveSlot(
  slot: string,
  groupMap: Record<string, TeamEntry[]>,
  best3rds: TeamEntry[]
): string {
  if (!slot.match(/^[12][A-L]$/) && !slot.startsWith('3°')) return slot;
  if (slot.startsWith('3°')) return '3° lugar';
  const pos = parseInt(slot[0]);
  const grp = slot[1];
  const teams = groupMap[grp];
  if (!teams || teams.length < pos) return slot;
  const sorted = [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
  return sorted[pos - 1]?.teamName || slot;
}

function SlotCard({ homeTeam, awayTeam, homeScore, awayScore, status, gameId, groupsComplete }: {
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  gameId: number;
  groupsComplete: boolean;
}) {
  const isLive    = ['1H','HT','2H','ET','PEN'].includes(status || '');
  const isDone    = status === 'FT';
  const isPending = !groupsComplete && !isLive && !isDone;
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

export function BracketSection() {
  const [groups, setGroups]     = useState<GroupStanding[]>([]);
  const [liveMatches, setLive]  = useState<LiveMatch[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [standingsData, matchesData] = await Promise.all([
          api.getStandings(),
          api.getTodayMatches(),
        ]);
        setGroups(standingsData as unknown as GroupStanding[]);
        setLive(matchesData as unknown as LiveMatch[]);
      } catch {}
      setLoading(false);
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  // Montar mapa grupo → times ordenados
  const groupMap: Record<string, TeamEntry[]> = {};
  groups.forEach(g => {
    const letter = getGroupLetter(g.group);
    groupMap[letter] = [...g.table].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  });

  // Melhores 3ºs lugares
  const allThirds: TeamEntry[] = Object.values(groupMap)
    .map(teams => teams[2])
    .filter(Boolean)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  const best8Thirds = allThirds.slice(0, 8);

  // Grupos completos = todos com 3 jogos disputados (cada time jogou 3x)
  const groupsComplete = Object.values(groupMap).length >= 12 &&
    Object.values(groupMap).every(teams => teams[0]?.played >= 3);

  // Resolver slots
  const resolvedSlots = BRACKET_SLOTS.map(slot => {
    let home = resolveSlot(slot.homeSlot, groupMap, best8Thirds);
    let away = resolveSlot(slot.awaySlot, groupMap, best8Thirds);

    // Se slot é 3°, pegar do best8Thirds na ordem
    if (slot.homeSlot.startsWith('3°')) {
      const idx = (slot.id - 61) * 2;
      home = best8Thirds[idx]?.teamName || '3° lugar';
      away = best8Thirds[idx + 1]?.teamName || '3° lugar';
    }

    // Verificar se há jogo ao vivo correspondente
    const live = liveMatches.find(m =>
      (m.homeTeam === home && m.awayTeam === away) ||
      (m.homeTeam === away && m.awayTeam === home)
    );

    return {
      ...slot,
      home:       live ? live.homeTeam : home,
      away:       live ? live.awayTeam : away,
      homeScore:  live?.team1Score,
      awayScore:  live?.team2Score,
      status:     live?.status,
    };
  });

  const liveCount = resolvedSlots.filter(s => ['1H','HT','2H','ET','PEN'].includes(s.status || '')).length;

  return (
    <section id="bracket" className="px-4 py-12 border-t border-slate-800/50">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">
              🏆 Chaveamento — Oitavas de Final
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Copa do Mundo FIFA 2026 · Atualizado automaticamente
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {liveCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-yellow-400 bg-yellow-950/40 border border-yellow-800/50 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                {liveCount} ao vivo
              </span>
            )}
            {!groupsComplete && (
              <span className="text-xs text-slate-600 bg-slate-800 px-3 py-1.5 rounded-full">
                📋 Fase de grupos em andamento
              </span>
            )}
            {groupsComplete && (
              <span className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-full">
                ✅ Grupos encerrados
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-800/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Grid 16 jogos */}
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
                  groupsComplete={groupsComplete}
                />
              ))}
            </div>

            {/* Status da classificação */}
            {!groupsComplete && (
              <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-xs font-black text-yellow-400 uppercase tracking-widest mb-3">
                  Classificados até agora
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {Object.entries(groupMap).map(([letter, teams]) => {
                    const first  = teams[0];
                    const second = teams[1];
                    const allPlayed = first?.played >= 3;
                    return (
                      <div key={letter} className="bg-slate-800/50 rounded-lg p-2.5">
                        <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-1.5">
                          Grupo {letter}
                        </p>
                        {[first, second].map((t, i) => t ? (
                          <div key={i} className="flex items-center gap-1.5 py-0.5">
                            <span className={`text-[10px] font-black w-3 ${allPlayed ? 'text-emerald-400' : 'text-slate-600'}`}>
                              {i + 1}
                            </span>
                            <span className="text-sm">{getFlag(t.teamName)}</span>
                            <span className={`text-[11px] font-semibold truncate ${allPlayed ? 'text-white' : 'text-slate-400'}`}>
                              {t.teamName}
                            </span>
                            <span className="ml-auto text-[10px] font-black text-yellow-500">{t.points}pts</span>
                          </div>
                        ) : (
                          <div key={i} className="h-5 bg-slate-700/30 rounded animate-pulse mt-0.5" />
                        ))}
                      </div>
                    );
                  })}
                </div>

                {/* Melhores 3ºs */}
                {allThirds.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Melhores 3ºs lugares ({allThirds.length}/12)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {allThirds.slice(0, 8).map((t, i) => (
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
