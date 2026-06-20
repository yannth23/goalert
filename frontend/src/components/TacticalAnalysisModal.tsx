'use client';

import { useEffect, useState } from 'react';
import { FootballMatch, TacticalAnalysis } from '../types';
import { api, H2HData } from '../lib/api';

interface TacticalAnalysisModalProps {
  match: FootballMatch;
  onClose: () => void;
}

const DOMINANCE_CONFIG: Record<string, {
  label: string; icon: string; color: string; bg: string; border: string;
}> = {
  possession: { label: 'Domínio com a Bola', icon: '⚽', color: 'text-blue-400',   bg: 'bg-blue-950/40',   border: 'border-blue-800/50'   },
  counter:    { label: 'Contra-Ataque',       icon: '⚡', color: 'text-yellow-400', bg: 'bg-yellow-950/40', border: 'border-yellow-800/50' },
  pressing:   { label: 'Pressão Alta',        icon: '🔥', color: 'text-orange-400', bg: 'bg-orange-950/40', border: 'border-orange-800/50' },
  defensive:  { label: 'Bloco Defensivo',     icon: '🛡️', color: 'text-slate-400',  bg: 'bg-slate-800/40',  border: 'border-slate-700/50'  },
  balanced:   { label: 'Jogo Equilibrado',    icon: '⚖️', color: 'text-green-400',  bg: 'bg-green-950/40',  border: 'border-green-800/50'  },
};


export function TacticalAnalysisModal({ match, onClose }: TacticalAnalysisModalProps) {
  const [h2h, setH2h] = useState<H2HData | null>(null);
  const [h2hLoading, setH2hLoading] = useState(true);

  useEffect(() => {
    setH2hLoading(true);
    api.getHeadToHead(match.team1, match.team2)
      .then(setH2h)
      .catch(() => setH2h(null))
      .finally(() => setH2hLoading(false));
  }, [match.team1, match.team2]);

  const tactics = match.tactics || {
    home: {
      formation: '4-3-3',
      lineup: ['Alisson', 'Danilo', 'Marquinhos', 'Gabriel Magalhães', 'Guilherme Arana', 'André', 'Bruno Guimarães', 'Gerson', 'Rodrygo', 'Endrick', 'Vinícius Jr'],
      keyPlayer: 'Vinícius Jr',
      intensity: 85,
      dominanceStyle: 'pressing' as const,
      dominanceDescription: 'Pressão alta e transições rápidas',
      gameDominanceProb: 72,
      heatmapData: [{ x: 50, y: 30, value: 0.8 }],
    },
    away: {
      formation: '4-5-1',
      lineup: ['Josué Duverger', 'Steeven Saba', 'Frantzdy Pierrot', 'Mechack Jérôme', 'Carlens Arcus', 'Wilde-Donald Guerrier', 'Derrick Etienne', 'Duckens Nazon', 'Kevin Lafrance', 'Ronaldo Damus', 'Sergio Mevs'],
      keyPlayer: 'Ronaldo Damus',
      intensity: 62,
      dominanceStyle: 'defensive' as const,
      dominanceDescription: 'Bloco defensivo profundo buscando espaços',
      gameDominanceProb: 28,
      heatmapData: [{ x: 30, y: 70, value: 0.5 }],
    },
  };

  const renderDominanceBadge = (data: TacticalAnalysis) => {
    const cfg = DOMINANCE_CONFIG[data.dominanceStyle] ?? DOMINANCE_CONFIG['balanced'];
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${cfg.bg} ${cfg.border}`}>
        <span className="text-base leading-none">{cfg.icon}</span>
        <div>
          <p className={`text-xs font-black uppercase tracking-wide ${cfg.color}`}>{cfg.label}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{data.dominanceDescription}</p>
        </div>
      </div>
    );
  };

  const renderTactics = (team: string, data: TacticalAnalysis) => (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
      <div className="flex justify-between items-center mb-5">
        <h4 className="text-xl font-black text-white">{team}</h4>
        <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tighter">
          {data.formation}
        </span>
      </div>

      {/* Estilo de Jogo */}
      <div className="mb-5">
        <span className="block text-[10px] uppercase text-slate-500 font-bold mb-2 tracking-widest">Estilo de Jogo</span>
        {renderDominanceBadge(data)}
      </div>

      {/* xG e Intensidade */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">xG Médio</span>
            <span className="text-sm font-black text-indigo-400">{data.expectedGoals?.toFixed(2) || '1.25'}</span>
          </div>
          <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-700"
              style={{ width: `${((data.expectedGoals || 1.25) / 3) * 100}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Intensidade</span>
            <span className="text-sm font-black text-orange-400">{data.intensity.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-700"
              style={{ width: `${data.intensity}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Avançadas (StatsBomb Style) */}
      <div className="bg-slate-900/40 rounded-xl p-4 border border-slate-800/50 mb-5">
        <p className="text-[10px] uppercase text-slate-500 font-bold mb-3 tracking-widest">Métricas Avançadas (StatsBomb)</p>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400">Passes Progressivos</span>
              <span className="text-white font-bold">{data.advancedStats?.passesProgressive || 42}</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${((data.advancedStats?.passesProgressive || 42) / 70) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400">Eficiência de Pressão</span>
              <span className="text-white font-bold">{data.advancedStats?.pressingEfficiency || 55}%</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${data.advancedStats?.pressingEfficiency || 55}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400">Deep Completions</span>
              <span className="text-white font-bold">{data.advancedStats?.deepCompletions || 12}</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${((data.advancedStats?.deepCompletions || 12) / 25) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Escalação */}
      <div className="mb-5">
        <h5 className="text-[10px] uppercase text-slate-500 font-bold mb-3 tracking-widest">Provável Escalação — Copa do Mundo 2026</h5>
        <div className="space-y-1">
          {data.lineup.map((player, i) => (
            <div key={i} className="flex items-center gap-3 bg-slate-900/30 p-2 rounded-lg border border-slate-800/50">
              <span className="w-5 h-5 flex items-center justify-center bg-slate-800 rounded text-[10px] font-bold text-slate-400 shrink-0">
                {i + 1}
              </span>
              <span className={`text-sm font-medium ${player === data.keyPlayer ? 'text-yellow-400' : 'text-slate-300'}`}>
                {player} {player === data.keyPlayer && '⭐'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Mapa de Calor */}
      <div>
        <h5 className="text-[10px] uppercase text-slate-500 font-bold mb-3 tracking-widest">Zonas de Ação</h5>
        <div className="relative aspect-[3/2] bg-[#0a1a0f] rounded-xl border-2 border-emerald-700/60 overflow-hidden shadow-inner">
          <div className="absolute inset-0 border-2 border-white/20 m-2 pointer-events-none">
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/10" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/20" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-16 h-32 border-r border-y border-white/20" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-16 border-r border-y border-white/20" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-16 h-32 border-l border-y border-white/20" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-16 border-l border-y border-white/20" />
          </div>
          {data.heatmapData.map((point, i) => (
            <div
              key={i}
              className="absolute rounded-full blur-md opacity-95"
              style={{
                left: `${point.x}%`, top: `${point.y}%`,
                width: '60px', height: '60px',
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, rgba(251,191,36,${point.value}) 0%, rgba(251,191,36,0) 70%)`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderH2H = () => {
    if (h2hLoading) {
      return (
        <div className="mt-8 bg-slate-800/30 border border-slate-700/40 rounded-2xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <div className="w-4 h-4 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm">Buscando confronto histórico...</span>
          </div>
        </div>
      );
    }
    if (!h2h || h2h.totalMatches === 0) {
      return (
        <div className="mt-8 bg-slate-800/30 border border-slate-700/40 rounded-2xl p-5 text-center">
          <p className="text-slate-500 text-sm">Nenhum confronto direto encontrado no histórico.</p>
        </div>
      );
    }

    const total = h2h.homeWins + h2h.draws + h2h.awayWins;
    const homeWinPct = total > 0 ? Math.round((h2h.homeWins / total) * 100) : 0;
    const drawPct    = total > 0 ? Math.round((h2h.draws    / total) * 100) : 0;
    const awayWinPct = 100 - homeWinPct - drawPct;

    return (
      <div className="mt-8 bg-slate-800/30 border border-slate-700/40 rounded-2xl p-6">
        <h4 className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-5 text-center">
          Confronto Histórico — {h2h.totalMatches} {h2h.totalMatches === 1 ? 'jogo' : 'jogos'}
        </h4>
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="text-center flex-1">
            <p className="text-white font-black text-sm mb-1">{match.team1}</p>
            <p className="text-3xl font-black text-green-400">{h2h.homeWins}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Vitórias</p>
          </div>
          <div className="text-center px-4">
            <p className="text-2xl font-black text-slate-500">{h2h.draws}</p>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mt-0.5">Empates</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-white font-black text-sm mb-1">{match.team2}</p>
            <p className="text-3xl font-black text-blue-400">{h2h.awayWins}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Vitórias</p>
          </div>
        </div>
        <div className="flex rounded-full overflow-hidden h-2.5 mb-3">
          {homeWinPct > 0 && <div className="bg-green-500" style={{ width: `${homeWinPct}%` }} />}
          {drawPct    > 0 && <div className="bg-slate-500" style={{ width: `${drawPct}%`    }} />}
          {awayWinPct > 0 && <div className="bg-blue-500"  style={{ width: `${awayWinPct}%` }} />}
        </div>
        <div className="flex justify-between text-xs text-slate-500 mb-5">
          <span>{h2h.totalGoalsHome} gols</span>
          <span>{h2h.totalGoalsAway} gols</span>
        </div>
        {h2h.recentMatches.length > 0 && (
          <div>
            <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-2">Últimos Confrontos</p>
            <div className="space-y-1.5">
              {h2h.recentMatches.map((m, i) => {
                const isTeam1Home = m.homeTeam.toLowerCase().includes(match.team1.toLowerCase());
                const t1Score = isTeam1Home ? m.homeScore : m.awayScore;
                const t2Score = isTeam1Home ? m.awayScore : m.homeScore;
                const winner = t1Score > t2Score ? match.team1 : t1Score < t2Score ? match.team2 : null;
                return (
                  <div key={i} className="flex items-center justify-between bg-slate-900/40 rounded-xl px-4 py-2 border border-slate-800/50">
                    <span className="text-[11px] text-slate-500 w-20 shrink-0">{m.date}</span>
                    <div className="flex items-center gap-2 flex-1 justify-center">
                      <span className={`text-xs font-bold ${winner === match.team1 ? 'text-green-400' : 'text-slate-300'}`}>{match.team1}</span>
                      <span className="text-sm font-black text-white bg-slate-800 px-2 py-0.5 rounded-lg">{t1Score} – {t2Score}</span>
                      <span className={`text-xs font-bold ${winner === match.team2 ? 'text-blue-400' : 'text-slate-300'}`}>{match.team2}</span>
                    </div>
                    <span className="text-[10px] text-slate-600 w-20 text-right shrink-0 truncate">{m.championship}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="min-w-0 pr-3">
            <h3 className="text-lg sm:text-2xl font-black text-white">Análise Tática</h3>
            <p className="text-slate-500 text-xs sm:text-sm font-medium truncate">{match.team1} vs {match.team2} — Copa do Mundo 2026</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">

          {/* 1. Provável dominante */}
          {(() => {
            const p1 = tactics.home.gameDominanceProb ?? 50;
            const p2 = tactics.away.gameDominanceProb ?? 50;
            const dominant = p1 >= p2 ? match.team1 : match.team2;
            const style = p1 >= p2 ? tactics.home.dominanceStyle : tactics.away.dominanceStyle;
            const cfg = DOMINANCE_CONFIG[style] ?? DOMINANCE_CONFIG['balanced'];
            return (
              <div className="flex items-center gap-2 bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3">
                <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest shrink-0">Provável dominante:</span>
                <span className="text-base leading-none">{cfg.icon}</span>
                <span className="text-sm font-black text-white">{dominant}</span>
              </div>
            );
          })()}

          {/* 2. Estilos lado a lado */}
          <div className="bg-slate-800/20 border border-slate-700/30 rounded-2xl p-4">
            <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-3 text-center">Como cada time vai jogar</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-white font-black text-xs mb-2 text-center">{match.team1}</p>
                {renderDominanceBadge(tactics.home)}
              </div>
              <div>
                <p className="text-white font-black text-xs mb-2 text-center">{match.team2}</p>
                {renderDominanceBadge(tactics.away)}
              </div>
            </div>
          </div>

          {/* 3. Insight da IA — específico para este jogo */}
          <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-2xl p-5">
            <p className="text-[10px] uppercase text-indigo-400 font-bold tracking-widest mb-2">Insight Tático da IA — {match.team1} vs {match.team2}</p>
            <p className="text-slate-300 text-sm leading-relaxed italic">
              {match.aiAnalysis || `O confronto entre ${match.team1} (${tactics.home.formation}) e ${match.team2} (${tactics.away.formation}) será definido pelo duelo entre os estilos opostos de jogo de cada seleção na Copa do Mundo 2026.`}
            </p>
          </div>

          {/* 4. Táticas individuais */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderTactics(match.team1, tactics.home)}
            {renderTactics(match.team2, tactics.away)}
          </div>

          {/* 5. Confronto Histórico */}
          {renderH2H()}
        </div>
      </div>
    </div>
  );
}
