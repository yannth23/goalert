'use client';

import { useState } from 'react';
import { MatchCard } from './MatchCard';
import { Loading } from './Loading';
import { EmptyState } from './EmptyState';
import { useMatches } from '../hooks/useMatches';
import type { FootballMatch } from '../types';

type StyleFilter = 'all' | 'pressing' | 'counter' | 'possession' | 'defensive';

const STYLE_OPTS: {
  key: StyleFilter;
  label: string;
  icon: string;
  pill: string;
  active: string;
}[] = [
  { key: 'all',        label: 'Todos',         icon: '⚽', pill: 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white',       active: 'bg-slate-700 border-slate-600 text-white' },
  { key: 'pressing',   label: 'Pressão',        icon: '🔥', pill: 'border-slate-700 text-slate-400 hover:border-orange-700 hover:text-orange-400', active: 'bg-orange-950 border-orange-700 text-orange-400' },
  { key: 'counter',    label: 'Contra-ataque',  icon: '⚡', pill: 'border-slate-700 text-slate-400 hover:border-yellow-700 hover:text-yellow-400', active: 'bg-yellow-950 border-yellow-700 text-yellow-400' },
  { key: 'possession', label: 'Posse de bola',  icon: '🔵', pill: 'border-slate-700 text-slate-400 hover:border-blue-700 hover:text-blue-400',    active: 'bg-blue-950 border-blue-700 text-blue-400' },
  { key: 'defensive',  label: 'Defensivo',      icon: '🛡️', pill: 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300',  active: 'bg-slate-800 border-slate-500 text-slate-300' },
];

function matchHasStyle(m: FootballMatch, style: StyleFilter): boolean {
  if (style === 'all') return true;
  return m.tactics?.home?.dominanceStyle === style || m.tactics?.away?.dominanceStyle === style;
}

export function MatchesSection() {
  const { matches, loading, reload } = useMatches();
  const [styleFilter, setStyleFilter] = useState<StyleFilter>('all');
  const [syncing, setSyncing] = useState(false);

  const handleReload = async () => {
    setSyncing(true);
    reload();
    await new Promise(r => setTimeout(r, 2000));
    setSyncing(false);
  };

  if (loading && matches.length === 0) return <Loading />;

  if (!matches.length) {
    return (
      <section id="matches" className="px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black mb-6">Jogos de Hoje</h2>
          <div className="text-center py-16 space-y-4">
            <div className="text-5xl">⚽</div>
            <p className="text-slate-400 text-lg">
              {syncing ? 'Sincronizando partidas...' : 'Buscando partidas de hoje...'}
            </p>
            <p className="text-slate-600 text-sm">
              Os dados são atualizados automaticamente a cada 30 segundos.
            </p>
            <button
              onClick={handleReload}
              disabled={syncing}
              className="mt-4 px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold border border-slate-700 transition-colors"
            >
              {syncing ? '↻ Buscando...' : '↻ Atualizar agora'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  const hasTactics = matches.some(m => m.tactics);

  const filtered = matches.filter(m => matchHasStyle(m, styleFilter));

  const grouped = filtered.reduce<Record<string, FootballMatch[]>>((acc, m) => {
    if (!acc[m.championship]) acc[m.championship] = [];
    acc[m.championship].push(m);
    return acc;
  }, {});

  return (
    <section id="matches" className="px-4 py-12">
      <div className="max-w-6xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
          <h2 className="text-3xl font-black shrink-0">Jogos de Hoje</h2>
          {filtered.length !== matches.length && (
            <span className="text-sm text-slate-500 pb-0.5">
              {filtered.length} de {matches.length} {matches.length === 1 ? 'jogo' : 'jogos'}
            </span>
          )}
        </div>

        {/* Filtros por estilo tático — só exibe se houver dados táticos */}
        {hasTactics && (
          <div className="mb-7 overflow-x-auto scrollbar-hide -mx-1 px-1">
            <div className="flex gap-2 min-w-max sm:min-w-0 sm:flex-wrap">
              {STYLE_OPTS.map(opt => {
                const count = opt.key === 'all'
                  ? matches.length
                  : matches.filter(m => matchHasStyle(m, opt.key)).length;
                if (opt.key !== 'all' && count === 0) return null;
                const isActive = styleFilter === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setStyleFilter(opt.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                      isActive ? opt.active : opt.pill
                    }`}
                  >
                    <span className="leading-none">{opt.icon}</span>
                    <span>{opt.label}</span>
                    <span className={`text-[10px] font-black leading-none ${isActive ? 'opacity-80' : 'opacity-50'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState message={`Nenhuma partida com estilo "${STYLE_OPTS.find(o => o.key === styleFilter)?.label}" hoje.`} />
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([championship, games]) => (
              <div key={championship}>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">
                  {championship}
                </h3>
                <div className="space-y-3">
                  {games.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
