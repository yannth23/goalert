'use client';

import { Loading } from './Loading';
import { EmptyState } from './EmptyState';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { GroupStanding } from '../types';

export function StandingsTable() {
  const [groups, setGroups] = useState<GroupStanding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStandings()
      .then((data) => setGroups(data as unknown as GroupStanding[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!groups.length) return <EmptyState message="Classificação indisponível." />;

  return (
    <section className="px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-black mb-8">Classificação</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groups.map((group) => (
            <div key={group.group} className="rounded-xl border border-slate-800 overflow-hidden">
              <div className="bg-slate-900 px-4 py-3">
                <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest">
                  {group.group.replace('GROUP_', 'Grupo ')}
                </h3>
              </div>

              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr className="text-xs text-slate-500">
                    <th className="p-3 text-left">#</th>
                    <th className="p-3 text-left">Time</th>
                    <th className="p-3 text-center">Pts</th>
                    <th className="p-3 text-center">J</th>
                    <th className="p-3 text-center">V</th>
                    <th className="p-3 text-center">E</th>
                    <th className="p-3 text-center">D</th>
                    <th className="p-3 text-center">SG</th>
                  </tr>
                </thead>
                <tbody>
                  {group.table.map((team) => (
                    <tr key={team.teamId} className="border-t border-slate-800 hover:bg-slate-900/40 transition">
                      <td className="p-3 text-slate-400 text-sm">{team.position}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {team.crest && (
                            <img src={team.crest} alt={team.teamName} className="w-5 h-5 object-contain" />
                          )}
                          <span className="text-sm font-semibold text-white">{team.teamName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center font-black text-yellow-500">{team.points}</td>
                      <td className="p-3 text-center text-slate-400 text-sm">{team.played}</td>
                      <td className="p-3 text-center text-slate-400 text-sm">{team.wins}</td>
                      <td className="p-3 text-center text-slate-400 text-sm">{team.draws}</td>
                      <td className="p-3 text-center text-slate-400 text-sm">{team.losses}</td>
                      <td className="p-3 text-center text-slate-400 text-sm">{team.goalDifference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
