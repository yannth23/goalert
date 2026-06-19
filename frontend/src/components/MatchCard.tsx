'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { FootballMatch } from '../types';
import { TacticalAnalysisModal } from './TacticalAnalysisModal';

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; live: boolean }> = {
  NS:  { label: 'Não iniciado',  bg: 'bg-slate-800',   text: 'text-slate-400',  live: false },
  '1H':{ label: '1º Tempo',      bg: 'bg-green-950',   text: 'text-green-400',  live: true  },
  HT:  { label: 'Intervalo',     bg: 'bg-yellow-950',  text: 'text-yellow-400', live: false },
  '2H':{ label: '2º Tempo',      bg: 'bg-green-950',   text: 'text-green-400',  live: true  },
  ET:  { label: 'Prorrogação',   bg: 'bg-green-950',   text: 'text-green-400',  live: true  },
  PEN: { label: 'Pênaltis',      bg: 'bg-orange-950',  text: 'text-orange-400', live: true  },
  FT:  { label: 'Encerrado',     bg: 'bg-slate-800',   text: 'text-slate-500',  live: false },
  PST: { label: 'Adiado',        bg: 'bg-red-950',     text: 'text-red-400',    live: false },
};

const FLAGS: Record<string, string> = {
  'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'France': '🇫🇷',
  'Germany': '🇩🇪', 'Spain': '🇪🇸', 'Portugal': '🇵🇹',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'United States': '🇺🇸', 'Mexico': '🇲🇽',
  'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Morocco': '🇲🇦',
  'Nigeria': '🇳🇬', 'Senegal': '🇸🇳', 'Croatia': '🇭🇷',
  'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Uruguay': '🇺🇾',
  'Italy': '🇮🇹', 'Switzerland': '🇨🇭', 'Denmark': '🇩🇰',
  'Australia': '🇦🇺', 'Canada': '🇨🇦', 'Ecuador': '🇪🇨',
  'Ghana': '🇬🇭', 'Qatar': '🇶🇦', 'Poland': '🇵🇱',
  'Tunisia': '🇹🇳', 'Cameroon': '🇨🇲', 'Costa Rica': '🇨🇷',
  'Serbia': '🇷🇸', 'Iran': '🇮🇷', 'Saudi Arabia': '🇸🇦',
  'Colombia': '🇨🇴', 'Chile': '🇨🇱', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Norway': '🇳🇴', 'Ukraine': '🇺🇦', 'Hungary': '🇭🇺',
  'Algeria': '🇩🇿', 'Indonesia': '🇮🇩', 'Slovenia': '🇸🇮',
  'Iraq': '🇮🇶', 'Sweden': '🇸🇪', 'Austria': '🇦🇹',
  'New Zealand': '🇳🇿', 'Egypt': '🇪🇬', "Côte d'Ivoire": '🇨🇮',
  'Ivory Coast': '🇨🇮', 'DR Congo': '🇨🇩', 'South Africa': '🇿🇦',
  'Türkiye': '🇹🇷', 'Turkey': '🇹🇷', 'Bosnia and Herzegovina': '🇧🇦',
  'Slovakia': '🇸🇰', 'Greece': '🇬🇷', 'Romania': '🇷🇴',
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Paraguay': '🇵🇾', 'Peru': '🇵🇪',
  'Bolivia': '🇧🇴', 'Venezuela': '🇻🇪', 'Panama': '🇵🇦',
};

const TEAM_PT: Record<string, string> = {
  'Mexico': 'México', 'South Korea': 'Coreia do Sul',
  'Czech Republic': 'República Tcheca', 'Czechia': 'República Tcheca',
  'South Africa': 'África do Sul', 'Switzerland': 'Suíça',
  'Canada': 'Canadá', 'Serbia': 'Sérvia',
  'Bosnia and Herzegovina': 'Bósnia e Herzegovina', 'Scotland': 'Escócia',
  'Morocco': 'Marrocos', 'Brazil': 'Brasil', 'Chile': 'Chile',
  'United States': 'Estados Unidos', 'Australia': 'Austrália',
  'Türkiye': 'Turquia', 'Turkey': 'Turquia', 'Netherlands': 'Holanda',
  'Germany': 'Alemanha', 'Japan': 'Japão', 'Belgium': 'Bélgica',
  'Costa Rica': 'Costa Rica', 'Portugal': 'Portugal',
  'Argentina': 'Argentina', 'Egypt': 'Egito', 'New Zealand': 'Nova Zelândia',
  'Spain': 'Espanha', 'France': 'França', 'Senegal': 'Senegal',
  'Uruguay': 'Uruguai', 'England': 'Inglaterra', 'Colombia': 'Colômbia',
  'Saudi Arabia': 'Arábia Saudita', 'Iran': 'Irã', 'Nigeria': 'Nigéria',
  'Croatia': 'Croácia', 'Denmark': 'Dinamarca', 'Ecuador': 'Equador',
  'Italy': 'Itália', 'Norway': 'Noruega', 'Iraq': 'Iraque',
  'Poland': 'Polônia', 'Ukraine': 'Ucrânia', 'Hungary': 'Hungria',
  'Algeria': 'Argélia', 'Cameroon': 'Camarões', 'Ghana': 'Gana',
  'Indonesia': 'Indonésia', 'Slovenia': 'Eslovênia', 'Sweden': 'Suécia',
  'Russia': 'Rússia', 'Greece': 'Grécia', 'Romania': 'Romênia',
  'Austria': 'Áustria', 'Qatar': 'Catar', 'Tunisia': 'Tunísia',
  'Ivory Coast': 'Costa do Marfim', "Côte d'Ivoire": 'Costa do Marfim',
  'DR Congo': 'Congo', 'Venezuela': 'Venezuela', 'Paraguay': 'Paraguai',
  'Peru': 'Peru', 'Bolivia': 'Bolívia', 'Jamaica': 'Jamaica',
  'Honduras': 'Honduras', 'Panama': 'Panamá', 'Guatemala': 'Guatemala',
  'Trinidad and Tobago': 'Trinidad e Tobago', 'Uzbekistan': 'Uzbequistão',
  'Slovakia': 'Eslováquia', 'Wales': 'País de Gales',
  'Northern Ireland': 'Irlanda do Norte',
  'Republic of Ireland': 'República da Irlanda', 'Ireland': 'Irlanda',
  'Kosovo': 'Kosovo', 'Albania': 'Albânia',
  'North Macedonia': 'Macedônia do Norte', 'Montenegro': 'Montenegro',
  'Kenya': 'Quênia', 'Mali': 'Mali', 'Angola': 'Angola',
  'Tanzania': 'Tanzânia', 'Zimbabwe': 'Zimbábue',
};

const COMPETITION_PT: Record<string, string> = {
  'FIFA World Cup': 'Copa do Mundo FIFA',
  'UEFA Champions League': 'Liga dos Campeões',
  'UEFA Europa League': 'Liga Europa',
  'Premier League': 'Premier League',
  'Primera Division': 'La Liga',
  'Bundesliga': 'Bundesliga',
  'Serie A': 'Serie A',
  'Ligue 1': 'Ligue 1',
  'Brasileirao Serie A': 'Brasileirão Série A',
  'Copa Libertadores': 'Copa Libertadores',
};

const STYLE_ICON: Record<string, string> = {
  possession: '⚽',
  counter:    '⚡',
  pressing:   '🔥',
  defensive:  '🛡️',
};

const STYLE_LABEL: Record<string, string> = {
  possession: 'Posse de bola',
  counter:    'Contra-ataque',
  pressing:   'Pressão',
  defensive:  'Defensivo',
};

function traduzirTime(nome: string): string {
  return TEAM_PT[nome] ?? nome;
}

function traduzirCompeticao(nome: string): string {
  return COMPETITION_PT[nome] ?? nome;
}

const LIVE_STATUSES = new Set(['1H', '2H', 'ET', 'PEN']);

interface MatchCardProps {
  match: FootballMatch;
  highlighted?: boolean;
}

const STYLE_COLOR: Record<string, string> = {
  pressing:   'text-orange-400',
  counter:    'text-yellow-400',
  possession: 'text-blue-400',
  defensive:  'text-slate-400',
};

const STYLE_BG: Record<string, string> = {
  pressing:   'bg-orange-950/60 border-orange-800/40',
  counter:    'bg-yellow-950/60 border-yellow-800/40',
  possession: 'bg-blue-950/60  border-blue-800/40',
  defensive:  'bg-slate-800/60  border-slate-700/40',
};

function TacticalClash({ match }: { match: FootballMatch }) {
  const home = match.tactics?.home;
  const away = match.tactics?.away;
  if (!home || !away) return null;

  const hs = home.dominanceStyle ?? 'pressing';
  const rawAway = away.dominanceStyle ?? 'counter';

  const CONTRAST: Record<string, string> = {
    pressing:   'counter',
    counter:    'possession',
    possession: 'defensive',
    defensive:  'pressing',
  };

  const as_ = rawAway === hs
    ? (CONTRAST[hs] as typeof rawAway)
    : rawAway;

  return (
    <div className="mt-3 pt-3 border-t border-slate-800">
      <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold mb-2 text-center">
        Confronto tático
      </p>

      <div className="flex items-center gap-2">
        {/* Time da casa */}
        <div className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-xl border ${STYLE_BG[hs]}`}>
          <span className="text-base leading-none">{STYLE_ICON[hs] ?? '⚽'}</span>
          <span className={`text-[10px] font-black uppercase tracking-wide leading-none ${STYLE_COLOR[hs]}`}>
            {STYLE_LABEL[hs]}
          </span>
          <span className="text-[9px] text-slate-500 truncate max-w-full font-medium">
            {traduzirTime(match.team1)}
          </span>
        </div>

        {/* Separador central */}
        <span className="text-slate-700 text-base leading-none shrink-0">⚔️</span>

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
  });

  const status = STATUS_MAP[match.status] ?? {
    label: match.status,
    bg: 'bg-slate-800',
    text: 'text-slate-400',
    live: false,
  };

  const isLive = LIVE_STATUSES.has(match.status);
  const isFinished = match.status === 'FT';
  const hasScore = match.team1Score !== undefined && match.team2Score !== undefined;

  const flag1 = match.team1Flag || FLAGS[match.team1] || '';
  const flag2 = match.team2Flag || FLAGS[match.team2] || '';

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
              ? <img src={flag1} alt={match.team1} className="w-6 h-4 object-contain" />
              : <span className="text-xl leading-none">{flag1}</span>
          )}
          <Link
            href={`/pais/${encodeURIComponent(match.team1)}`}
            className="font-bold text-white text-sm text-right leading-tight truncate max-w-full hover:text-yellow-400 transition-colors"
          >
            {traduzirTime(match.team1)}
          </Link>
        </div>

        <div className="flex flex-col items-center px-2 shrink-0">
          {(isLive || isFinished) && hasScore ? (
            <span className={`font-black text-xl sm:text-2xl px-3 py-1 rounded-xl whitespace-nowrap ${
              isLive
                ? 'bg-yellow-950/70 text-yellow-400'
                : 'bg-slate-800 text-slate-300'
            }`}>
              {match.team1Score} – {match.team2Score}
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
              ? <img src={flag2} alt={match.team2} className="w-6 h-4 object-contain" />
              : <span className="text-xl leading-none">{flag2}</span>
          )}
          <Link
            href={`/pais/${encodeURIComponent(match.team2)}`}
            className="font-bold text-white text-sm leading-tight truncate max-w-full hover:text-yellow-400 transition-colors"
          >
            {traduzirTime(match.team2)}
          </Link>
        </div>
      </div>

      <TacticalClash match={match} />

      {match.predictions && (
        <div className="mt-3 pt-3 border-t border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              Predições Estatísticas
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTactics(true)}
                className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-0.5 rounded-full font-bold transition-colors"
              >
                Análise Tática
              </button>
              <span className="text-[10px] bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                AI Insight
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-800/50 p-2 rounded-lg text-center">
              <span className="block text-[10px] text-slate-500 mb-0.5">Gols</span>
              <span className="text-xs font-bold text-white">
                {match.predictions.goalsHome.toFixed(1)} - {match.predictions.goalsAway.toFixed(1)}
              </span>
            </div>
            <div className="bg-slate-800/50 p-2 rounded-lg text-center">
              <span className="block text-[10px] text-slate-500 mb-0.5">Cartões</span>
              <span className="text-xs font-bold text-white">{match.predictions.cards}</span>
            </div>
            <div className="bg-slate-800/50 p-2 rounded-lg text-center">
              <span className="block text-[10px] text-slate-500 mb-0.5">Faltas</span>
              <span className="text-xs font-bold text-white">{match.predictions.fouls}</span>
            </div>
          </div>
        </div>
      )}

      {showTactics && (
        <TacticalAnalysisModal match={match} onClose={() => setShowTactics(false)} />
      )}

      {highlighted && (
        <div className="mt-3 pt-3 border-t border-yellow-900/40 flex items-center gap-1.5 text-xs text-yellow-500 font-semibold">
          <span>⭐</span>
          <span>Time favorito</span>
        </div>
      )}
    </div>
  );
}
