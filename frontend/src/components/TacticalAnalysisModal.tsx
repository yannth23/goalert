'use client';

import { useEffect, useState } from 'react';
import { FootballMatch, TacticalAnalysis, KeyDuel } from '../types';
import { api, H2HData } from '../lib/api';
import { TacticalMomentum } from './TacticalMomentum';

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
};

const GOAL_TYPE_ICON: Record<string, string> = {
  cabeça:     '↗️',
  cabeçada:   '↗️',
  lateral:    '↩️',
  cruzamento: '↩️',
  fora:       '💥',
  falta:      '🎯',
  pênalti:    '🎯',
  contra:     '🔄',
  individual: '⭐',
  escanteio:  '🚩',
  pressão:    '🔥',
  pressing:   '🔥',
  default:    '⚽',
};

function getGoalIcon(scenario: string): string {
  const lower = scenario.toLowerCase();
  for (const [key, icon] of Object.entries(GOAL_TYPE_ICON)) {
    if (key !== 'default' && lower.includes(key)) return icon;
  }
  return GOAL_TYPE_ICON.default;
}

// ── Barra de Probabilidade de Resultado ──────────────────────────────────────
function ResultProbBar({
  winHome, draw, winAway, homeName, awayName,
}: {
  winHome: number; draw: number; winAway: number;
  homeName: string; awayName: string;
}) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-5">
      <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-4 text-center">
        📊 Probabilidade de Resultado
      </p>

      {/* Barra tripartida */}
      <div className="flex rounded-xl overflow-hidden h-8 mb-4 gap-0.5">
        <div
          className="flex items-center justify-center bg-amber-500/80 transition-all"
          style={{ width: `${winHome}%` }}
        >
          {winHome >= 15 && (
            <span className="text-[11px] font-black text-amber-950">{winHome}%</span>
          )}
        </div>
        <div
          className="flex items-center justify-center bg-slate-600/80 transition-all"
          style={{ width: `${draw}%` }}
        >
          {draw >= 10 && (
            <span className="text-[11px] font-black text-slate-200">{draw}%</span>
          )}
        </div>
        <div
          className="flex items-center justify-center bg-indigo-500/80 transition-all"
          style={{ width: `${winAway}%` }}
        >
          {winAway >= 15 && (
            <span className="text-[11px] font-black text-indigo-950">{winAway}%</span>
          )}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex justify-between text-xs">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500/80 shrink-0" />
            <span className="font-bold text-amber-400 truncate max-w-[90px]">{homeName}</span>
          </div>
          <span className="text-lg font-black text-white ml-4">{winHome}%</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-slate-600/80 shrink-0" />
            <span className="font-bold text-slate-400">Empate</span>
          </div>
          <span className="text-lg font-black text-white">{draw}%</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-indigo-400 truncate max-w-[90px]">{awayName}</span>
            <span className="w-3 h-3 rounded-sm bg-indigo-500/80 shrink-0" />
          </div>
          <span className="text-lg font-black text-white mr-4">{winAway}%</span>
        </div>
      </div>
    </div>
  );
}

// ── Card de Duelo-Chave ───────────────────────────────────────────────────────
function DuelCard({ duel, homeName, awayName }: { duel: KeyDuel; homeName: string; awayName: string }) {
  const adv = duel.advantage;
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3 text-center">
        {duel.context}
      </p>
      <div className="flex items-center gap-2">
        {/* Time da casa */}
        <div className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-xl ${adv === 'home' ? 'bg-amber-950/60 border border-amber-700/50' : 'bg-slate-900/40 border border-slate-800/50'}`}>
          <span className="text-[10px] font-bold text-slate-500 truncate w-full text-center">{homeName}</span>
          <span className={`text-sm font-black text-center ${adv === 'home' ? 'text-amber-400' : 'text-slate-300'}`}>
            {duel.homePlayer}
          </span>
          {adv === 'home' && <span className="text-xs text-amber-500 font-bold">↑ Vantagem</span>}
        </div>

        {/* VS */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          {adv === 'equal' ? (
            <span className="text-[10px] font-black text-slate-600 px-1">VS</span>
          ) : (
            <span className="text-base">{adv === 'home' ? '🏆' : '🔑'}</span>
          )}
        </div>

        {/* Time visitante */}
        <div className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-xl ${adv === 'away' ? 'bg-indigo-950/60 border border-indigo-700/50' : 'bg-slate-900/40 border border-slate-800/50'}`}>
          <span className="text-[10px] font-bold text-slate-500 truncate w-full text-center">{awayName}</span>
          <span className={`text-sm font-black text-center ${adv === 'away' ? 'text-indigo-400' : 'text-slate-300'}`}>
            {duel.awayPlayer}
          </span>
          {adv === 'away' && <span className="text-xs text-indigo-400 font-bold">↑ Vantagem</span>}
        </div>
      </div>
    </div>
  );
}

// ── Campo unificado com zonas de ambos os times ───────────────────────────────
function ContrastField({
  homeData, awayData, homeName, awayName,
}: {
  homeData: { x: number; y: number; value: number }[];
  awayData: { x: number; y: number; value: number }[];
  homeName: string;
  awayName: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-700/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/60 border-b border-slate-700/40">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
          <span className="w-3 h-3 rounded-full bg-amber-400/80 shrink-0" />
          {homeName}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Zonas de Ação</span>
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-400">
          {awayName}
          <span className="w-3 h-3 rounded-full bg-indigo-400/80 shrink-0" />
        </span>
      </div>
      <div className="relative bg-[#0a1a0f]" style={{ paddingBottom: '62%' }}>
        <div className="absolute inset-0">
          <div className="absolute inset-0 m-3 border-2 border-white/20 rounded-sm pointer-events-none">
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/15" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[18%] h-[32%] rounded-full border border-white/15" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[16%] h-[55%] border-r-2 border-y-2 border-white/20" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[6%] h-[28%] border-r border-y border-white/15" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[16%] h-[55%] border-l-2 border-y-2 border-white/20" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[6%] h-[28%] border-l border-y border-white/15" />
          </div>
          {homeData.map((point, i) => (
            <div key={`home-${i}`} className="absolute rounded-full blur-lg" style={{
              left: `${point.x}%`, top: `${point.y}%`, width: '72px', height: '72px',
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, rgba(251,191,36,${Math.min(0.85, point.value * 1.1)}) 0%, rgba(251,191,36,0) 70%)`,
            }} />
          ))}
          {awayData.map((point, i) => (
            <div key={`away-${i}`} className="absolute rounded-full blur-lg" style={{
              left: `${point.x}%`, top: `${point.y}%`, width: '72px', height: '72px',
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, rgba(99,102,241,${Math.min(0.85, point.value * 1.1)}) 0%, rgba(99,102,241,0) 70%)`,
            }} />
          ))}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-white/30 rotate-90 tracking-widest">GOL</div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-white/30 -rotate-90 tracking-widest">GOL</div>
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({ index, text }: { index: number; text: string }) {
  const icon = getGoalIcon(text);
  return (
    <div className="flex items-start gap-3 bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3 hover:border-emerald-800/60 transition-colors">
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-900/50 border border-emerald-800/60 shrink-0 mt-0.5">
        <span className="text-sm leading-none">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest block mb-0.5">Cena #{index + 1}</span>
        <p className="text-slate-300 text-sm leading-snug">{text}</p>
      </div>
    </div>
  );
}

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
      formation: '4-3-3', lineup: ['Goleiro', 'Lateral D', 'Zagueiro', 'Zagueiro', 'Lateral E', 'Vol', 'Meia', 'Meia', 'Ponta D', 'Centroavante', 'Ponta E'],
      keyPlayer: match.team1, intensity: 70, dominanceStyle: 'pressing' as const,
      dominanceDescription: 'Pressão alta e transições', gameDominanceProb: 55,
      heatmapData: [{ x: 70, y: 30, value: 0.9 }, { x: 80, y: 50, value: 0.7 }],
    },
    away: {
      formation: '4-4-2', lineup: ['Goleiro', 'Lateral D', 'Zagueiro', 'Zagueiro', 'Lateral E', 'Meia D', 'Vol', 'Vol', 'Meia E', 'Centro', 'Centro'],
      keyPlayer: match.team2, intensity: 60, dominanceStyle: 'defensive' as const,
      dominanceDescription: 'Bloco defensivo organizado', gameDominanceProb: 45,
      heatmapData: [{ x: 30, y: 50, value: 0.8 }, { x: 20, y: 30, value: 0.6 }],
    },
  };

  const homeDomProb = tactics.home.gameDominanceProb ?? 50;
  const awayDomProb = tactics.away.gameDominanceProb ?? 50;
  const dominantTeam = homeDomProb >= awayDomProb ? match.team1 : match.team2;
  const dominantStyle = homeDomProb >= awayDomProb ? tactics.home.dominanceStyle : tactics.away.dominanceStyle;
  const dominantCfg = DOMINANCE_CONFIG[dominantStyle] ?? DOMINANCE_CONFIG['pressing'];

  const goalScenarios: string[] = (tactics.home as any).goalScenarios ?? [];
  const winProbHome: number = (tactics.home as any).winProbHome ?? Math.round(homeDomProb * 0.85);
  const winProbAway: number = (tactics.home as any).winProbAway ?? Math.round(awayDomProb * 0.85);
  const drawProb: number    = (tactics.home as any).drawProb ?? Math.max(5, 100 - winProbHome - winProbAway);
  const keyDuels: KeyDuel[] = (tactics.home as any).keyDuels ?? [];

  const renderDominanceBadge = (data: TacticalAnalysis) => {
    const cfg = DOMINANCE_CONFIG[data.dominanceStyle] ?? DOMINANCE_CONFIG['pressing'];
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

  const renderLineup = (team: string, data: TacticalAnalysis) => (
    <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-base font-black text-white">{team}</h4>
        <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tighter">
          {data.formation}
        </span>
      </div>
      <div className="mb-4">
        <span className="block text-[10px] uppercase text-slate-500 font-bold mb-2 tracking-widest">Estilo de Jogo</span>
        {renderDominanceBadge(data)}
      </div>
      <div>
        <h5 className="text-[10px] uppercase text-slate-500 font-bold mb-2 tracking-widest">Provável Escalação</h5>
        <div className="space-y-1">
          {data.lineup.map((player, i) => (
            <div key={i} className="flex items-center gap-3 bg-slate-900/30 p-2 rounded-lg border border-slate-800/50">
              <span className="w-5 h-5 flex items-center justify-center bg-slate-800 rounded text-[10px] font-bold text-slate-400 shrink-0">{i + 1}</span>
              <span className={`text-sm font-medium ${player === data.keyPlayer ? 'text-yellow-400' : 'text-slate-300'}`}>
                {player} {player === data.keyPlayer && '⭐'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderH2H = () => {
    if (h2hLoading) {
      return (
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <div className="w-4 h-4 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm">Buscando confronto histórico...</span>
          </div>
        </div>
      );
    }
    if (!h2h || h2h.totalMatches === 0) {
      return (
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-5 text-center">
          <p className="text-slate-500 text-sm">Nenhum confronto direto encontrado no histórico.</p>
        </div>
      );
    }
    return (
      <div className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-6">
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
        <div className="flex justify-between text-xs text-slate-500 mb-4">
          <span>{h2h.totalGoalsHome} gols marcados</span>
          <span>{h2h.totalGoalsAway} gols marcados</span>
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
            <h3 className="text-lg sm:text-2xl font-black text-white">Relatório Tático</h3>
            <p className="text-slate-500 text-xs sm:text-sm font-medium truncate">{match.team1} vs {match.team2} — Copa do Mundo 2026</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">

          {/* 1. Probabilidades de resultado — destaque principal */}
          <ResultProbBar
            winHome={winProbHome}
            draw={drawProb}
            winAway={winProbAway}
            homeName={match.team1}
            awayName={match.team2}
          />

          {/* 2. Provável dominante da posse */}
          <div className={`flex items-center gap-3 rounded-2xl border px-5 py-4 ${dominantCfg.bg} ${dominantCfg.border}`}>
            <span className="text-2xl">{dominantCfg.icon}</span>
            <div>
              <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Provável dominante da posse</p>
              <p className={`text-lg font-black ${dominantCfg.color}`}>{dominantTeam}</p>
            </div>
          </div>

          {/* 3. Estilos lado a lado */}
          <div className="bg-slate-800/20 border border-slate-700/30 rounded-2xl p-4">
            <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-3 text-center">Como cada time vai jogar</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-amber-400 font-black text-xs mb-2 text-center">{match.team1}</p>
                {renderDominanceBadge(tactics.home)}
              </div>
              <div>
                <p className="text-indigo-400 font-black text-xs mb-2 text-center">{match.team2}</p>
                {renderDominanceBadge(tactics.away)}
              </div>
            </div>
          </div>

          {/* 4. Duelos-Chave */}
          {keyDuels.length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-3">⚔️ Duelos-Chave</p>
              <div className="space-y-3">
                {keyDuels.map((duel, i) => (
                  <DuelCard key={i} duel={duel} homeName={match.team1} awayName={match.team2} />
                ))}
              </div>
            </div>
          )}

          {/* 5. Campo unificado contrastado */}
          <div>
            <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-3">🗺️ Zonas de Ação — Campo Contrastado</p>
            <ContrastField
              homeData={tactics.home.heatmapData}
              awayData={tactics.away.heatmapData}
              homeName={match.team1}
              awayName={match.team2}
            />
          </div>

          {/* 5b. Momentum Tático ao Vivo */}
          {(match.status !== 'NS' && match.status !== 'PST') && (
            <TacticalMomentum match={match} />
          )}

          {/* 6. Resumo tático */}
          <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-2xl p-5">
            <p className="text-[10px] uppercase text-indigo-400 font-bold tracking-widest mb-2">
              🧠 Análise Tática — {match.team1} vs {match.team2}
            </p>
            <p className="text-slate-300 text-sm leading-relaxed">
              {match.aiAnalysis || `O confronto entre ${match.team1} (${tactics.home.formation}) e ${match.team2} (${tactics.away.formation}) será decidido pelo choque de estilos na Copa do Mundo 2026.`}
            </p>
          </div>

          {/* 7. Sugestões — como os gols podem sair */}
          {goalScenarios.length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-3">
                💡 Cenas Prováveis de Gol
              </p>
              <div className="space-y-2">
                {goalScenarios.map((scenario, i) => (
                  <SuggestionCard key={i} index={i} text={scenario} />
                ))}
              </div>
            </div>
          )}

          {/* 8. Escalações individuais */}
          <div>
            <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-3">👥 Escalações Prováveis</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {renderLineup(match.team1, tactics.home)}
              {renderLineup(match.team2, tactics.away)}
            </div>
          </div>

          {/* 9. Confronto Histórico */}
          <div>
            <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-3">📊 Histórico de Confrontos</p>
            {renderH2H()}
          </div>

        </div>
      </div>
    </div>
  );
}
