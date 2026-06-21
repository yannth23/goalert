import React, { useState } from 'react';
import Link from 'next/link';
import { FootballMatch } from '../types';
import { traduzirTime, traduzirCompeticao } from '../lib/utils';

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'PEN', 'LIVE']);

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; live: boolean }> = {
  'NS':  { label: 'Agendado', bg: 'bg-slate-800', text: 'text-slate-400', live: false },
  '1H':  { label: '1º Tempo', bg: 'bg-yellow-950/50', text: 'text-yellow-500', live: true },
  'HT':  { label: 'Intervalo', bg: 'bg-yellow-950/50', text: 'text-yellow-500', live: true },
  '2H':  { label: '2º Tempo', bg: 'bg-yellow-950/50', text: 'text-yellow-500', live: true },
  'ET':  { label: 'Prorrogação', bg: 'bg-yellow-950/50', text: 'text-yellow-500', live: true },
  'PEN': { label: 'Pênaltis', bg: 'bg-yellow-950/50', text: 'text-yellow-500', live: true },
  'FT':  { label: 'Encerrado', bg: 'bg-slate-800', text: 'text-slate-400', live: false },
  'PST': { label: 'Adiado', bg: 'bg-red-950/30', text: 'text-red-400', live: false },
};

const FLAGS: Record<string, string> = {
  'Brasil': '🇧🇷', 'Argentina': '🇦🇷', 'França': '🇫🇷', 'Alemanha': '🇩🇪', 'Espanha': '🇪🇸',
  'Portugal': '🇵🇹', 'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Itália': '🇮🇹', 'Holanda': '🇳🇱', 'Bélgica': '🇧🇪',
  'Uruguai': '🇺🇾', 'Croácia': '🇭🇷', 'Marrocos': '🇲🇦', 'Japão': '🇯🇵', 'Coreia do Sul': '🇰🇷',
  'EUA': '🇺🇸', 'México': '🇲🇽', 'Canadá': '🇨🇦', 'Senegal': '🇸🇳', 'Camarões': '🇨🇲',
  'Gana': '🇬🇭', 'Nigéria': '🇳🇬', 'Egito': '🇪🇬', 'Argélia': '🇩🇿', 'Tunísia': '🇹🇳',
  'Catar': '🇶🇦', 'Arábia Saudita': '🇸🇦', 'Irã': '🇮🇷', 'Austrália': '🇦🇺', 'Suíça': '🇨🇭',
  'Dinamarca': '🇩🇰', 'Sérvia': '🇷🇸', 'Polônia': '🇵🇱', 'Suécia': '🇸🇪', 'Noruega': '🇳🇴',
};

const STYLE_ICON: Record<string, string> = {
  'Vertical': '📐', 'Posicional': '♟️', 'Contra-ataque': '⚡', 'Retranca': '🛡️', 'Equilibrado': '⚖️'
};

const STYLE_LABEL: Record<string, string> = {
  'Vertical': 'Vertical', 'Posicional': 'Posicional', 'Contra-ataque': 'Transição', 'Retranca': 'Defensivo', 'Equilibrado': 'Equilibrado'
};

const STYLE_BG: Record<string, string> = {
  'Vertical': 'bg-blue-950/20 border-blue-900/30',
  'Posicional': 'bg-emerald-950/20 border-emerald-900/30',
  'Contra-ataque': 'bg-yellow-950/20 border-yellow-900/30',
  'Retranca': 'bg-slate-950/20 border-slate-900/30',
  'Equilibrado': 'bg-indigo-950/20 border-indigo-900/30'
};

const STYLE_COLOR: Record<string, string> = {
  'Vertical': 'text-blue-400',
  'Posicional': 'text-emerald-400',
  'Contra-ataque': 'text-yellow-400',
  'Retranca': 'text-slate-400',
  'Equilibrado': 'text-indigo-400'
};

interface MatchCardProps {
  match: FootballMatch;
  highlighted?: boolean;
}

function TacticalClash({ match }: { match: FootballMatch }) {
  if (!match.homeTactics || !match.awayTactics) return null;
  const hs = match.homeTactics.style || 'Equilibrado';
  const as_ = match.awayTactics.style || 'Equilibrado';

  return (
    <div className="mt-4 pt-4 border-t border-slate-800/50">
      <div className="flex items-center justify-center gap-1.5 mb-3">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Confronto Tático</span>
      </div>
      
      <div className="flex items-stretch gap-2">
        {/* Time mandante */}
        <div className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-xl border ${STYLE_BG[hs]}`}>
          <span className="text-base leading-none">{STYLE_ICON[hs] ?? '⚽'}</span>
          <span className={`text-[10px] font-black uppercase tracking-wide leading-none ${STYLE_COLOR[hs]}`}>
            {STYLE_LABEL[hs]}
          </span>
          <span className="text-[9px] text-slate-500 truncate max-w-full font-medium">
            {traduzirTime(match.team1)}
          </span>
        </div>

        <div className="flex items-center justify-center px-1">
          <span className="text-[10px] font-black text-slate-700">VS</span>
        </div>

        {/* Time visitante */}
        <div className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-xl border ${STYLE_BG[as_]}`}>
          <span className="text-base leading-none">{STYLE_ICON[as_] ?? '⚽'}</span>
          <span className={`text-[10px] font-black uppercase tracking-wide leading-none ${STYLE_COLOR[as_]}`}>
            {STYLE_LABEL[as_]}
          </span>
          <span className="text-[9px] text-slate-500 truncate max-w-full font-medium">
            {traduzirTime(match.team2)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function MatchCard({ match, highlighted }: MatchCardProps) {
  const [showTactics, setShowTactics] = useState(false);

  const time = new Date(match.date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC', // Força a exibição do horário UTC enviado pelo backend (que já é o horário de Brasília no scraper)
  });

  const status = STATUS_MAP[match.status] ?? {
    label: match.status,
    bg: 'bg-slate-800',
    text: 'text-slate-400',
    live: false,
  };

  const isLive = LIVE_STATUSES.has(match.status);
  const isFinished = match.status === 'FT';
  
  const homeTeam = (match as any).homeTeam || match.team1;
  const awayTeam = (match as any).awayTeam || match.team2;
  const homeScore = (match as any).homeScore ?? match.team1Score;
  const awayScore = (match as any).awayScore ?? match.team2Score;
  const homeFlag = (match as any).homeFlag || match.team1Flag;
  const awayFlag = (match as any).awayFlag || match.team2Flag;

  const flag1 = homeFlag || FLAGS[homeTeam] || '';
  const flag2 = awayFlag || FLAGS[awayTeam] || '';

  return (
    <div className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-all ${
      highlighted
        ? 'border-yellow-600/50 shadow-yellow-900/20 shadow-lg'
        : 'border-slate-800'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 font-medium truncate max-w-[55%]">
          {traduzirCompeticao(match.championship)}
        </span>
        <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${status.bg} ${status.text}`}>
          {status.live && (
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          )}
          {status.label}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 flex flex-col items-end gap-0.5 min-w-0">
          {flag1 && (
            flag1.startsWith('http')
              ? <img src={flag1} alt={homeTeam} className="w-6 h-4 object-contain" />
              : <span className="text-xl leading-none">{flag1}</span>
          )}
          <Link
            href={`/selecoes/${encodeURIComponent(homeTeam)}`}
            className="font-bold text-white text-sm text-right leading-tight truncate max-w-full hover:text-yellow-400 transition-colors"
          >
            {traduzirTime(homeTeam)}
          </Link>
        </div>

        <div className="flex flex-col items-center px-2 shrink-0">
          {(isLive || isFinished) && (homeScore !== undefined && awayScore !== undefined) ? (
            <span className={`font-black text-xl sm:text-2xl px-3 py-1 rounded-xl whitespace-nowrap ${
              isLive
                ? 'bg-yellow-950/70 text-yellow-400'
                : 'bg-slate-800 text-slate-300'
            }`}>
              {homeScore} – {awayScore}
            </span>
          ) : (
            <>
              <span className="text-sm text-slate-400 font-semibold whitespace-nowrap">{time}</span>
              <span className="text-xs text-slate-700">vs</span>
            </>
          )}
        </div>

        <div className="flex-1 flex flex-col items-start gap-0.5 min-w-0">
          {flag2 && (
            flag2.startsWith('http')
              ? <img src={flag2} alt={awayTeam} className="w-6 h-4 object-contain" />
              : <span className="text-xl leading-none">{flag2}</span>
          )}
          <Link
            href={`/selecoes/${encodeURIComponent(awayTeam)}`}
            className="font-bold text-white text-sm leading-tight truncate max-w-full hover:text-yellow-400 transition-colors"
          >
            {traduzirTime(awayTeam)}
          </Link>
        </div>
      </div>

      <TacticalClash match={match} />

      {match.predictions && (
        <div className="mt-4 pt-4 border-t border-slate-800/50">
          <div className="flex flex-wrap justify-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-slate-500 uppercase font-bold">Gols</span>
              <span className="text-xs font-black text-white">{match.predictions.predictedGoalsHome} – {match.predictions.predictedGoalsAway}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-slate-500 uppercase font-bold">Cartões</span>
              <span className="text-xs font-black text-white">{match.predictions.predictedCards}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-slate-500 uppercase font-bold">Faltas</span>
              <span className="text-xs font-black text-white">{match.predictions.predictedFouls}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <button
          onClick={() => setShowTactics(!showTactics)}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all"
        >
          {showTactics ? 'Ocultar Análise AI' : 'Ver Análise AI'}
        </button>
        
        {showTactics && (
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 animate-in fade-in slide-in-from-top-2">
            <p className="text-xs text-slate-300 leading-relaxed italic">
              "{match.aiAnalysis || 'Análise tática em processamento...'}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
