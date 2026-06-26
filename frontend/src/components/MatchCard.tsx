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
  'Equador': '🇪🇨', 'Colômbia': '🇨🇴', 'Chile': '🇨🇱', 'Peru': '🇵🇪', 'Paraguai': '🇵🇾',
  'Bolívia': '🇧🇴', 'Venezuela': '🇻🇪', 'Panamá': '🇵🇦', 'Costa Rica': '🇨🇷', 'Jamaica': '🇯🇲',
  'Haiti': '🇭🇹', 'Trinidad': '🇹🇹', 'El Salvador': '🇸🇻', 'Honduras': '🇭🇳', 'Guatemala': '🇬🇹',
  'Turquia': '🇹🇷', 'Ucrânia': '🇺🇦', 'Áustria': '🇦🇹', 'Tchéquia': '🇨🇿', 'Hungria': '🇭🇺',
  'Romênia': '🇷🇴', 'Grécia': '🇬🇷', 'Escócia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'País de Gales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Eslováquia': '🇸🇰',
  'Eslovênia': '🇸🇮', 'Albânia': '🇦🇱', 'Geórgia': '🇬🇪', 'Macedônia': '🇲🇰', 'Kosovo': '🇽🇰',
  'Iraque': '🇮🇶', 'Indonésia': '🇮🇩', 'China': '🇨🇳', 'Nova Zelândia': '🇳🇿', 'Índia': '🇮🇳',
  'Costa do Marfim': '🇨🇮', 'África do Sul': '🇿🇦', 'Zimbábue': '🇿🇼', 'RD Congo': '🇨🇩',
  'Curaçau': '🇨🇼', 'Cabo Verde': '🇨🇻', 'Islândia': '🇮🇸', 'Finlândia': '🇫🇮',
  'Bielorrússia': '🇧🇾', 'Moldávia': '🇲🇩', 'Armênia': '🇦🇲', 'Azerbaijão': '🇦🇿',
  'Cazaquistão': '🇰🇿', 'Uzbequistão': '🇺🇿', 'Afeganistão': '🇦🇫', 'Paquistão': '🇵🇰',
  'Bósnia': '🇧🇦', 'Montenegro': '🇲🇪', 'Bulgária': '🇧🇬', 'Lituânia': '🇱🇹',
  'Letônia': '🇱🇻', 'Estônia': '🇪🇪', 'Luxemburgo': '🇱🇺', 'Malta': '🇲🇹',
};

const STYLE_ICON: Record<string, string> = {
  pressing: '🔥', counter: '⚡', possession: '🔵', defensive: '🛡️'
};

const STYLE_LABEL: Record<string, string> = {
  pressing: 'Pressão', counter: 'Contra-ataque', possession: 'Posse', defensive: 'Defensivo'
};

const STYLE_BG: Record<string, string> = {
  pressing: 'bg-orange-950/30 border-orange-900/40',
  counter: 'bg-yellow-950/30 border-yellow-900/40',
  possession: 'bg-blue-950/30 border-blue-900/40',
  defensive: 'bg-slate-800/40 border-slate-700/50'
};

const STYLE_COLOR: Record<string, string> = {
  pressing: 'text-orange-400',
  counter: 'text-yellow-400',
  possession: 'text-blue-400',
  defensive: 'text-slate-300'
};

interface MatchCardProps {
  match: FootballMatch;
  highlighted?: boolean;
}

const VALID_STYLES = new Set(['pressing', 'counter', 'possession', 'defensive']);

const CONTRAST: Record<string, string> = {
  pressing:   'counter',
  counter:    'possession',
  possession: 'defensive',
  defensive:  'pressing',
};

function normalizeStyle(style: string | undefined): 'pressing' | 'counter' | 'possession' | 'defensive' {
  if (!style) return 'pressing';
  const s = style.toLowerCase().trim();
  if (s.includes('press')) return 'pressing';
  if (s.includes('counter') || s.includes('contra')) return 'counter';
  if (s.includes('possess') || s.includes('posse')) return 'possession';
  if (s.includes('defens')) return 'defensive';
  if (VALID_STYLES.has(s)) return s as 'pressing' | 'counter' | 'possession' | 'defensive';
  return 'pressing';
}

function getTacticsStyle(tactics: any): 'pressing' | 'counter' | 'possession' | 'defensive' {
  // Tenta vários campos possíveis que a IA pode ter usado
  const raw = tactics?.dominanceStyle 
    ?? tactics?.dominance_style 
    ?? tactics?.style 
    ?? tactics?.focus
    ?? tactics?.playStyle;
  return normalizeStyle(raw);
}

function TacticalClash({ match }: { match: FootballMatch }) {
  if (!match.tactics?.home || !match.tactics?.away) return null;
  const home = match.tactics.home;
  const away = match.tactics.away;
  const hs = getTacticsStyle(home);
  const raw = getTacticsStyle(away);
  const as_ = raw === hs ? (CONTRAST[hs] as typeof raw) : raw;
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
    timeZone: 'America/Sao_Paulo',
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
  const homeScore = match.team1Score ?? (match as any).homeScore;
  const awayScore = match.team2Score ?? (match as any).awayScore;
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
          ) : isFinished ? (
            <span className="font-black text-xl sm:text-2xl px-3 py-1 rounded-xl whitespace-nowrap bg-slate-800 text-slate-500">
              – : –
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

      {/* Predições + Análise AI */}
      {match.predictions && (
        <div className="mt-4 pt-4 border-t border-slate-800/50 space-y-3">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-800/60 rounded-xl p-2.5 text-center">
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">⚽ Gols proj.</p>
              <p className="text-sm font-black text-white">
                {match.predictions.goalsHome?.toFixed(1)}
                <span className="text-slate-500 mx-0.5">–</span>
                {match.predictions.goalsAway?.toFixed(1)}
              </p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-2.5 text-center">
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">🟨 Cartões</p>
              <p className="text-sm font-black text-white">{match.predictions.cards ?? '—'}</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-2.5 text-center">
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">🦵 Faltas</p>
              <p className="text-sm font-black text-white">{match.predictions.fouls ?? '—'}</p>
            </div>
          </div>

          {/* Análise AI — sempre visível, expansível */}
          {match.aiAnalysis && (
            <div className="relative">
              <button
                onClick={() => setShowTactics(!showTactics)}
                className="w-full text-left"
              >
                <div className={`bg-slate-950/80 border border-slate-800 rounded-xl p-3 transition-all ${showTactics ? '' : 'line-clamp-2'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black text-purple-400 bg-purple-950/50 px-2 py-0.5 rounded-full tracking-widest uppercase">AI Insight</span>
                    {match.tactics?.home?.shortInsight && (
                      <span className="text-[10px] text-slate-500 truncate">{match.tactics.home.shortInsight}</span>
                    )}
                  </div>
                  <p className={`text-xs text-slate-300 leading-relaxed ${showTactics ? '' : 'line-clamp-2'}`}>
                    {match.aiAnalysis}
                  </p>
                  {!showTactics && (
                    <p className="text-[10px] text-purple-400 mt-1 font-semibold">Ver análise completa ↓</p>
                  )}
                  {showTactics && (
                    <p className="text-[10px] text-slate-600 mt-1 font-semibold">Recolher ↑</p>
                  )}
                </div>
              </button>

              {/* Ponto de atenção */}
              {showTactics && match.attentionPoint && (
                <div className="mt-2 flex items-start gap-2 bg-yellow-950/30 border border-yellow-800/40 rounded-xl p-3">
                  <span className="text-base shrink-0">👁️</span>
                  <div>
                    <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-0.5">Ponto de atenção</p>
                    <p className="text-xs text-slate-300">{match.attentionPoint}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!match.aiAnalysis && (
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-800/30 rounded-xl px-3 py-2">
              <span className="animate-pulse">⚙️</span>
              <span>Análise tática em processamento...</span>
            </div>
          )}
        </div>
      )}

      {!match.predictions && (
        <div className="mt-4 pt-4 border-t border-slate-800/50">
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-800/30 rounded-xl px-3 py-2">
            <span className="animate-pulse">⚙️</span>
            <span>Predições sendo geradas pela IA...</span>
          </div>
        </div>
      )}
    </div>
  );
}
