import { Loading } from './Loading';
import { EmptyState } from './EmptyState';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Scorer } from '../types';

export function TopScorers() {
  const [scorers, setScorers] = useState<Scorer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTopScorers()
      .then(setScorers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!scorers.length) return <EmptyState message="Artilheiros indisponíveis." />;

  return (
    <section className="px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-black mb-6">Artilheiros</h2>

        <div className="space-y-3">
          {scorers.map((scorer, i) => (
            <div
              key={scorer.playerId}
              className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4"
            >
              <span className={`text-xl font-black w-6 text-center ${i < 3 ? 'text-yellow-500' : 'text-slate-600'}`}>
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="font-bold text-white">{scorer.playerName}</div>
                <div className="text-xs text-slate-500 mt-0.5">{scorer.teamName}</div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-yellow-500">{scorer.goals}</span>
                <span className="text-xs text-slate-500 ml-1">gols</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}