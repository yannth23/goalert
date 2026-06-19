'use client';

import { FootballMatch, TacticalAnalysis } from '../types';

interface TacticalAnalysisModalProps {
  match: FootballMatch;
  onClose: () => void;
}

export function TacticalAnalysisModal({ match, onClose }: TacticalAnalysisModalProps) {
  // Se não houver táticas, gera dados mockados na hora para não travar o usuário
  const tactics = match.tactics || {
    home: {
      formation: '4-3-3',
      lineup: ['Alisson', 'Marquinhos', 'Casemiro', 'Neymar', 'Vinícius Jr'],
      keyPlayer: 'Neymar',
      possession: 52,
      intensity: 85,
      heatmapData: [{ x: 50, y: 50, value: 0.8 }]
    },
    away: {
      formation: '4-4-2',
      lineup: ['Ederson', 'Thiago Silva', 'Paquetá', 'Rodrygo', 'Richarlison'],
      keyPlayer: 'Rodrygo',
      possession: 48,
      intensity: 80,
      heatmapData: [{ x: 30, y: 30, value: 0.6 }]
    }
  };

  const renderTactics = (team: string, data: TacticalAnalysis) => (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-xl font-black text-white">{team}</h4>
        <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tighter">
          {data.formation}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
          <span className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Posse de Bola</span>
          <span className="text-2xl font-black text-indigo-400">{data.possession.toFixed(1)}%</span>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
          <span className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Intensidade</span>
          <span className="text-2xl font-black text-orange-400">{data.intensity.toFixed(0)}%</span>
        </div>
      </div>

      <div className="mb-8">
        <h5 className="text-[10px] uppercase text-slate-500 font-bold mb-3 tracking-widest">Provável Escalação</h5>
        <div className="grid grid-cols-1 gap-2">
          {data.lineup.map((player, i) => (
            <div key={i} className="flex items-center gap-3 bg-slate-900/30 p-2 rounded-lg border border-slate-800/50">
              <span className="w-5 h-5 flex items-center justify-center bg-slate-800 rounded text-[10px] font-bold text-slate-400">
                {i + 1}
              </span>
              <span className={`text-sm font-medium ${player === data.keyPlayer ? 'text-yellow-400' : 'text-slate-300'}`}>
                {player} {player === data.keyPlayer && '⭐'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h5 className="text-[10px] uppercase text-slate-500 font-bold mb-3 tracking-widest">Mapa de Calor (Zonas de Ação)</h5>
        <div className="relative aspect-[3/2] bg-emerald-950/40 rounded-xl border-2 border-emerald-800/40 overflow-hidden shadow-inner">
          {/* Campo de futebol realista */}
          <div className="absolute inset-0 border-2 border-white/10 m-2 pointer-events-none">
            {/* Linha de meio campo */}
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/10" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/10" />
            
            {/* Grande área esquerda */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-16 h-32 border-r border-y border-white/10" />
            {/* Pequena área esquerda */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-16 border-r border-y border-white/10" />
            
            {/* Grande área direita */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-16 h-32 border-l border-y border-white/10" />
            {/* Pequena área direita */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-16 border-l border-y border-white/10" />
          </div>

          {/* Heatmap points */}
          {data.heatmapData.map((point, i) => (
            <div
              key={i}
              className="absolute rounded-full blur-2xl opacity-60"
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
                width: '60px',
                height: '60px',
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, rgba(251, 191, 36, ${point.value}) 0%, rgba(251, 191, 36, 0) 70%)`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black text-white">Análise Tática</h3>
            <p className="text-slate-500 text-sm font-medium">{match.team1} vs {match.team2}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {renderTactics(match.team1, tactics.home)}
            {renderTactics(match.team2, tactics.away)}
          </div>

          <div className="mt-12 bg-indigo-950/30 border border-indigo-900/50 rounded-3xl p-8 text-center">
            <h4 className="text-indigo-400 font-black text-lg mb-2">Conclusão Matemática do AI Insight</h4>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
              Baseado na formação {tactics.home.formation} do {match.team1} e no volume de jogo de {tactics.home.possession.toFixed(0)}%, 
              espera-se uma partida com alta densidade no meio-campo. A probabilidade de {match.predictions?.goalsHome.toFixed(1)} gols para o mandante 
              reflete a eficiência ofensiva de {tactics.home.keyPlayer}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
