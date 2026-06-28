'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const FLAGS: Record<string, string> = {
  'Brasil': '🇧🇷', 'Argentina': '🇦🇷', 'França': '🇫🇷', 'Alemanha': '🇩🇪',
  'Espanha': '🇪🇸', 'Portugal': '🇵🇹', 'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Itália': '🇮🇹',
  'Holanda': '🇳🇱', 'Bélgica': '🇧🇪', 'Uruguai': '🇺🇾', 'Croácia': '🇭🇷',
  'Marrocos': '🇲🇦', 'Japão': '🇯🇵', 'Coreia do Sul': '🇰🇷', 'EUA': '🇺🇸',
  'México': '🇲🇽', 'Canadá': '🇨🇦', 'Senegal': '🇸🇳', 'Equador': '🇪🇨',
  'Colômbia': '🇨🇴', 'Suíça': '🇨🇭', 'Dinamarca': '🇩🇰', 'Polônia': '🇵🇱',
  'Austrália': '🇦🇺', 'Catar': '🇶🇦', 'Arábia Saudita': '🇸🇦', 'Irã': '🇮🇷',
  'Turquia': '🇹🇷', 'Ucrânia': '🇺🇦', 'Áustria': '🇦🇹', 'Suécia': '🇸🇪',
  'Noruega': '🇳🇴', 'Sérvia': '🇷🇸', 'Escócia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Haiti': '🇭🇹',
  'Costa do Marfim': '🇨🇮', 'Nigéria': '🇳🇬', 'Gana': '🇬🇭', 'Camarões': '🇨🇲',
  'Panamá': '🇵🇦', 'Peru': '🇵🇪', 'Chile': '🇨🇱', 'Venezuela': '🇻🇪',
  'Paraguai': '🇵🇾', 'Bolívia': '🇧🇴', 'Curaçau': '🇨🇼', 'Cabo Verde': '🇨🇻',
  'Iraque': '🇮🇶', 'Argélia': '🇩🇿', 'Tchéquia': '🇨🇿', 'Azerbaijão': '🇦🇿',
};

// Grupos da Copa 2026
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

// Chaveamento oficial Copa 2026 — Oitavas de Final
// Formato: 1A vs 2B, 1B vs 2A, etc.
const ROUND_OF_32 = [
  { id: 'R1',  home: '1A', away: '2B', label: 'Jogo 1' },
  { id: 'R2',  home: '1C', away: '2D', label: 'Jogo 2' },
  { id: 'R3',  home: '1E', away: '2F', label: 'Jogo 3' },
  { id: 'R4',  home: '1G', away: '2H', label: 'Jogo 4' },
  { id: 'R5',  home: '1I', away: '2J', label: 'Jogo 5' },
  { id: 'R6',  home: '1K', away: '2L', label: 'Jogo 6' },
  { id: 'R7',  home: '1B', away: '2A', label: 'Jogo 7' },
  { id: 'R8',  home: '1D', away: '2C', label: 'Jogo 8' },
  { id: 'R9',  home: '1F', away: '2E', label: 'Jogo 9' },
  { id: 'R10', home: '1H', away: '2G', label: 'Jogo 10' },
  { id: 'R11', home: '1J', away: '2I', label: 'Jogo 11' },
  { id: 'R12', home: '1L', away: '2K', label: 'Jogo 12' },
  { id: 'R13', home: '3°(A/B/C/D)', away: '3°(E/F/G/H)', label: 'Jogo 13' },
  { id: 'R14', home: '3°(I/J/K/L)', away: '3°(A/B/C)', label: 'Jogo 14' },
  { id: 'R15', home: '3°(D/E/F)', away: '3°(G/H/I)', label: 'Jogo 15' },
  { id: 'R16', home: '3°(J/K/L)', away: '3°(D/E/F/G)', label: 'Jogo 16' },
];

interface LiveMatch {
  homeTeam: string;
  awayTeam: string;
  team1Score?: number;
  team2Score?: number;
  status: string;
}

function BracketCard({
  home, away, homeScore, awayScore, status, label
}: {
  home: string; away: string;
  homeScore?: number; awayScore?: number;
  status?: string; label: string;
}) {
  const flag = (t: string) => FLAGS[t] || '';
  const isLive = ['1H','HT','2H','ET','PEN'].includes(status || '');
  const isDone = status === 'FT';
  const homeWins = isDone && (homeScore ?? 0) > (awayScore ?? 0);
  const awayWins = isDone && (awayScore ?? 0) > (homeScore ?? 0);
  const isPending = !home.match(/^[12]/) && !isDone && !isLive;

  return (
    <div className={`rounded-xl overflow-hidden border min-w-0 transition-all ${
      isLive
        ? 'border-yellow-500/60 shadow-lg shadow-yellow-900/20'
        : isDone
        ? 'border-slate-700'
        : 'border-slate-800'
    }`}>
      {isLive && (
        <div className="bg-yellow-500 px-2 py-0.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
          <span className="text-[9px] font-black text-black uppercase tracking-widest">Ao Vivo</span>
        </div>
      )}
      <div className="text-[9px] text-slate-600 font-bold uppercase px-2.5 pt-1.5 tracking-widest">{label}</div>
      <div className="bg-slate-900 divide-y divide-slate-800/50">
        {/* Home */}
        <div className={`flex items-center justify-between px-2.5 py-2 ${homeWins ? 'bg-yellow-950/30' : ''}`}>
          <div className="flex items-center gap-1.5 min-w-0">
            {flag(home) && <span className="text-sm">{flag(home)}</span>}
            <span className={`text-xs font-semibold truncate ${
              isPending ? 'text-slate-600 italic' :
              homeWins ? 'text-yellow-400' : 'text-slate-200'
            }`}>
              {isPending ? home : (home || 'A definir')}
            </span>
          </div>
          <span className={`text-sm font-black ml-2 tabular-nums shrink-0 ${
            homeWins ? 'text-yellow-400' :
            isLive ? 'text-white' :
            isDone ? 'text-slate-300' : 'text-slate-700'
          }`}>
            {isLive || isDone ? (homeScore ?? 0) : '—'}
          </span>
        </div>
        {/* Away */}
        <div className={`flex items-center justify-between px-2.5 py-2 ${awayWins ? 'bg-yellow-950/30' : ''}`}>
          <div className="flex items-center gap-1.5 min-w-0">
            {flag(away) && <span className="text-sm">{flag(away)}</span>}
            <span className={`text-xs font-semibold truncate ${
              isPending ? 'text-slate-600 italic' :
              awayWins ? 'text-yellow-400' : 'text-slate-200'
            }`}>
              {isPending ? away : (away || 'A definir')}
            </span>
          </div>
          <span className={`text-sm font-black ml-2 tabular-nums shrink-0 ${
            awayWins ? 'text-yellow-400' :
            isLive ? 'text-white' :
            isDone ? 'text-slate-300' : 'text-slate-700'
          }`}>
            {isLive || isDone ? (awayScore ?? 0) : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function BracketSection() {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [activeRound, setActiveRound] = useState<'oitavas' | 'quartas' | 'semi' | 'final'>('oitavas');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getTodayMatches();
        setLiveMatches(data as LiveMatch[]);
      } catch {}
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  // Detectar se jogo ao vivo bate com alguma entrada do bracket
  const getLiveData = (home: string, away: string) => {
    return liveMatches.find(m =>
      (m.homeTeam === home && m.awayTeam === away) ||
      (m.homeTeam === away && m.awayTeam === home)
    );
  };

  const rounds = [
    { key: 'oitavas', label: '⚔️ Oitavas de Final', count: 16 },
    { key: 'quartas', label: '🔥 Quartas de Final', count: 8 },
    { key: 'semi',    label: '⚡ Semifinais',        count: 4 },
    { key: 'final',   label: '🏆 Final',             count: 1 },
  ] as const;

  return (
    <section id="bracket" className="px-4 py-12 border-t border-slate-800/50">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">
              🏆 Chaveamento
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">Copa do Mundo FIFA 2026 · Mata-mata</p>
          </div>
        </div>

        {/* Round tabs */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto scrollbar-hide">
          {rounds.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveRound(key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeRound === key
                  ? 'bg-yellow-500 text-black'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Oitavas */}
        {activeRound === 'oitavas' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ROUND_OF_32.map((m) => {
              const live = getLiveData(m.home, m.away);
              return (
                <BracketCard
                  key={m.id}
                  label={m.label}
                  home={live?.homeTeam ?? m.home}
                  away={live?.awayTeam ?? m.away}
                  homeScore={live?.team1Score}
                  awayScore={live?.team2Score}
                  status={live?.status}
                />
              );
            })}
          </div>
        )}

        {/* Fases futuras */}
        {activeRound !== 'oitavas' && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <span className="text-6xl">
              {activeRound === 'quartas' ? '🔥' : activeRound === 'semi' ? '⚡' : '🏆'}
            </span>
            <p className="text-white font-bold text-lg">
              {activeRound === 'quartas' ? 'Quartas de Final' :
               activeRound === 'semi' ? 'Semifinais' : 'Final'}
            </p>
            <p className="text-slate-500 text-sm max-w-xs">
              Será atualizado automaticamente conforme as fases avançam.
            </p>
          </div>
        )}

        {/* Legenda */}
        <div className="mt-6 flex items-center gap-4 text-xs text-slate-600 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>Vencedor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span>Ao vivo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 italic text-xs">1A / 2B</span>
            <span>= Classificado do grupo (a definir)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
