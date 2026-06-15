'use client';

import { MatchCard } from './MatchCard';
import { Loading } from './Loading';
import { EmptyState } from './EmptyState';
import { useMatches } from '../hooks/useMatches';

export function MatchesSection() {
  const { matches, loading } = useMatches();

  if (loading) return <Loading />;

  if (!matches.length) {
    return <EmptyState message="Nenhuma partida encontrada." />;
  }

  const grouped = matches.reduce<Record<string, typeof matches>>((acc, match) => {
    if (!acc[match.championship]) acc[match.championship] = [];
    acc[match.championship].push(match);
    return acc;
  }, {});

  return (
    <section id="matches" className="px-4 py-12">
      <div className="max-w-6xl mx-auto">

        <h2 className="text-3xl font-black mb-8">
          Jogos de Hoje
        </h2>

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

      </div>
    </section>
  );
}