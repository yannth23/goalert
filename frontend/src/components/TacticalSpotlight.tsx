'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { FootballMatch, TacticalAnalysis } from '../types';

const STYLE_CFG: Record<string, { label: string; icon: string; color: string; bg: string; border: string; bar: string }> = {
  possession: { label: 'Posse de Bola',  icon: '⚽', color: 'text-blue-400',   bg: 'bg-blue-950/50',   border: 'border-blue-800/60',   bar: 'bg-blue-500'   },
  counter:    { label: 'Contra-Ataque',  icon: '⚡', color: 'text-yellow-400', bg: 'bg-yellow-950/50', border: 'border-yellow-800/60', bar: 'bg-yellow-400' },
  pressing:   { label: 'Pressão Alta',   icon: '🔥', color: 'text-orange-400', bg: 'bg-orange-950/50', border: 'border-orange-800/60', bar: 'bg-orange-500' },
  defensive:  { label: 'Bloco Def.',     icon: '🛡️', color: 'text-slate-400',  bg: 'bg-slate-800/50',  border: 'border-slate-700/60',  bar: 'bg-slate-500'  },
};

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'PEN']);

function pickSpotlight(matches: FootballMatch[]): FootballMatch | null {
  const withTactics = matches.filter(m => m.tactics?.home && m.tactics?.away);
  if (!withTactics.length) return null;
  const live = withTactics.filter(m => LIVE_STATUSES.has(m.status));
  if (live.length) return live[0];
  const upcoming = withTactics.filter(m => m.status === 'NS');
  if (upcoming.length) return upcoming[0];
  return withTactics[0];
}

function IntensityBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

function StyleBadge({ style }: { style: string }) {
  const cfg = STYLE_CFG[style] ?? STYLE_CFG['pressing'];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

function TeamCard({ name, tactics, side }: { name: string; tactics: TacticalAnalysis; side: 'home' | 'away' }) {
  const cfg = STYLE_CFG[tactics.dominanceStyle] ?? STYLE_CFG['pressing'];
  const isAway = side === 'away';

  return (
    <div className={`flex-1 rounded-2xl border p-5 flex flex-col gap-3 ${cfg.bg} ${cfg.border}`}>
      <div className={`flex items-start gap-2 ${isAway ? 'flex-row-reverse text-right' : ''}`}>
        <div className={`text-2xl leading-none shrink-0 ${isAway ? '' : ''}`}>{cfg.icon}</div>
        <div className={isAway ? '' : ''}>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
            {isAway ? 'Visitante' : 'Mandante'}
          </p>
          <p className="font-black text-white text-base leading-tight">{name}</p>
        </div>
      </div>

      <div className={`flex flex-wrap gap-2 ${isAway ? 'justify-end' : ''}`}>
        <StyleBadge style={tactics.dominanceStyle} />
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border border-slate-700/60 bg-slate-800/50 text-slate-300">
          {tactics.formation}
        </span>
      </div>

      <p className={`text-xs text-slate-400 leading-relaxed ${isAway ? 'text-right' : ''}`}>
        {tactics.dominanceDescription}
      </p>

      <div className="space-y-1.5">
        <div className={`flex items-center justify-between text-[10px] text-slate-500 ${isAway ? 'flex-row-reverse' : ''}`}>
          <span>Intensidade</span>
          <span className={`font-bold ${cfg.color}`}>{tactics.intensity}/100</span>
        </div>
        <IntensityBar value={tactics.intensity} color={cfg.bar} />
      </div>

      <div className={`pt-1 border-t border-slate-800/60 ${isAway ? 'text-right' : ''}`}>
        <p className="text-[10px] text-slate-600 uppercase tracking-widest">Estrela</p>
        <p className={`text-sm font-bold mt-0.5 ${cfg.color}`}>{tactics.keyPlayer}</p>
      </div>
    </div>
  );
}

export function TacticalSpotlight() {
  const [match, setMatch] = useState<FootballMatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTodayMatches()
      .then((raw) => {
        const all = raw as unknown as FootballMatch[];
        setMatch(pickSpotlight(all));
      })
      .catch(() => setMatch(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="h-64 rounded-3xl bg-slate-900/60 animate-pulse border border-slate-800" />
        </div>
      </section>
    );
  }

  if (!match) return null;

  const home = match.tactics!.home;
  const away = match.tactics!.away;
  const homePct = home.gameDominanceProb ?? 50;
  const awayPct = 100 - homePct;
  const isLive = LIVE_STATUSES.has(match.status);
  const homeCfg = STYLE_CFG[home.dominanceStyle] ?? STYLE_CFG['pressing'];
  const awayCfg = STYLE_CFG[away.dominanceStyle] ?? STYLE_CFG['pressing'];

  return (
    <section className="px-4 py-10" id="spotlight">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            {isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">
              {isLive ? '🔴 Análise ao vivo' : '🔍 Análise tática em destaque'}
            </span>
          </div>
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-xs text-slate-600">{match.championship}</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">

          {/* Score / Status bar */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-4">
              <span className="text-lg font-black text-white truncate max-w-[120px] sm:max-w-none">{match.team1}</span>
              <div className="flex items-center gap-2 shrink-0">
                {(match.team1Score !== undefined && match.team2Score !== undefined) ? (
                  <span className="text-2xl font-black text-yellow-400 tabular-nums">
                    {match.team1Score} – {match.team2Score}
                  </span>
                ) : (
                  <span className="text-sm font-bold text-slate-500 px-3 py-1 rounded-lg border border-slate-700">VS</span>
                )}
              </div>
              <span className="text-lg font-black text-white truncate max-w-[120px] sm:max-w-none">{match.team2}</span>
            </div>
            {match.status === 'NS' && (
              <p className="text-xs text-slate-500 mt-1">
                {new Date(match.date).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          {/* Domínio bar */}
          <div>
            <div className="flex justify-between text-[11px] font-bold mb-1.5">
              <span className={homeCfg.color}>{homePct}% domínio</span>
              <span className="text-slate-600 text-[10px] uppercase tracking-widest">Controle de jogo</span>
              <span className={awayCfg.color}>{awayPct}% domínio</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
              <div className={`rounded-l-full transition-all ${homeCfg.bar}`} style={{ width: `${homePct}%` }} />
              <div className={`rounded-r-full transition-all ${awayCfg.bar}`} style={{ width: `${awayPct}%` }} />
            </div>
          </div>

          {/* Team cards */}
          <div className="flex flex-col sm:flex-row gap-4">
            <TeamCard name={match.team1} tactics={home} side="home" />

            {/* VS divider */}
            <div className="hidden sm:flex flex-col items-center justify-center gap-2 shrink-0">
              <div className="w-px flex-1 bg-slate-800" />
              <span className="text-xs font-black text-slate-700">VS</span>
              <div className="w-px flex-1 bg-slate-800" />
            </div>

            <TeamCard name={match.team2} tactics={away} side="away" />
          </div>

          {/* AI Analysis */}
          {match.aiAnalysis && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mb-1.5">🤖 Análise da IA</p>
              <p className="text-sm text-slate-300 leading-relaxed">{match.aiAnalysis}</p>
            </div>
          )}

          {/* CTA */}
          <div className="text-center pt-2">
            <a
              href="#matches"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm transition"
            >
              Ver todas as análises táticas
              <span>→</span>
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
