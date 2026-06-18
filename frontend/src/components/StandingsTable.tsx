'use client';

import { Loading } from './Loading';
import { EmptyState } from './EmptyState';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { GroupStanding } from '../types';

// Unicode flags by English team name
const FLAGS: Record<string, string> = {
  'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'France': '🇫🇷', 'Germany': '🇩🇪',
  'Spain': '🇪🇸', 'Portugal': '🇵🇹', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'United States': '🇺🇸',
  'Mexico': '🇲🇽', 'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Morocco': '🇲🇦',
  'Nigeria': '🇳🇬', 'Senegal': '🇸🇳', 'Croatia': '🇭🇷', 'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪', 'Uruguay': '🇺🇾', 'Italy': '🇮🇹', 'Switzerland': '🇨🇭',
  'Denmark': '🇩🇰', 'Australia': '🇦🇺', 'Canada': '🇨🇦', 'Ecuador': '🇪🇨',
  'Ghana': '🇬🇭', 'Qatar': '🇶🇦', 'Poland': '🇵🇱', 'Tunisia': '🇹🇳',
  'Cameroon': '🇨🇲', 'Costa Rica': '🇨🇷', 'Serbia': '🇷🇸', 'Iran': '🇮🇷',
  'Saudi Arabia': '🇸🇦', 'Colombia': '🇨🇴', 'Chile': '🇨🇱', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Norway': '🇳🇴', 'Ukraine': '🇺🇦', 'Hungary': '🇭🇺', 'Algeria': '🇩🇿',
  'Indonesia': '🇮🇩', 'Slovenia': '🇸🇮', 'Iraq': '🇮🇶', 'Sweden': '🇸🇪',
  'Austria': '🇦🇹', 'New Zealand': '🇳🇿', 'Egypt': '🇪🇬',
  "Côte d'Ivoire": '🇨🇮', 'Ivory Coast': '🇨🇮', 'DR Congo': '🇨🇩',
  'South Africa': '🇿🇦', 'Türkiye': '🇹🇷', 'Turkey': '🇹🇷',
};

function qualificationClass(position: number): string {
  if (position <= 2) return 'border-l-2 border-l-green-500';
  if (position === 3) return 'border-l-2 border-l-yellow-500/50';
  return '';
}

function goalDiffClass(diff: number): string {
  if (diff > 0) return 'text-green-400';
  if (diff < 0) return 'text-red-400';
  return 'text-slate-400';
}

function goalDiffLabel(diff: number): string {
  if (diff > 0) return `+${diff}`;
  return String(diff);
}

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
        <h2 className="text-3xl font-black mb-2">Classificação</h2>
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-7">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-green-500" />
            Classificado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500/50" />
            3º lugar
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groups.map((group) => (
            <div key={group.group} className="rounded-xl border border-slate-800 overflow-hidden">
              <div className="bg-slate-900 px-4 py-3">
                <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-widest">
                  {group.group.replace('GROUP_', 'Grupo ')}
                </h3>
              </div>

              <table className="w-full bg-slate-950">
                <thead className="bg-slate-900/50">
                  <tr className="text-xs text-slate-500 uppercase tracking-wider">
                    <th className="p-3 text-left w-8">#</th>
                    <th className="p-3 text-left">Time</th>
                    <th className="p-3 text-center font-bold text-slate-300">Pts</th>
                    <th className="p-3 text-center">J</th>
                    <th className="p-3 text-center">V</th>
                    <th className="p-3 text-center">E</th>
                    <th className="p-3 text-center">D</th>
                    <th className="p-3 text-center">SG</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-950">
                  {group.table.map((team) => (
                    <tr
                      key={team.teamId}
                      className={`border-t border-slate-800 hover:bg-slate-900 transition ${qualificationClass(team.position)}`}
                    >
                      <td className="p-3 text-slate-500 text-sm font-medium">{team.position}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {FLAGS[team.teamName] ? (
                            <span className="text-base leading-none">{FLAGS[team.teamName]}</span>
                          ) : team.crest ? (
                            <img src={team.crest} alt={team.teamName} className="w-5 h-5 object-contain" />
                          ) : null}
                          <span className="text-sm font-semibold text-slate-100">{team.teamName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center font-black text-yellow-500">{team.points}</td>
                      <td className="p-3 text-center text-slate-400 text-sm">{team.played}</td>
                      <td className="p-3 text-center text-sm font-semibold text-green-500">{team.wins}</td>
                      <td className="p-3 text-center text-slate-400 text-sm">{team.draws}</td>
                      <td className="p-3 text-center text-sm text-red-400/80">{team.losses}</td>
                      <td className={`p-3 text-center text-sm font-semibold ${goalDiffClass(team.goalDifference)}`}>
                        {goalDiffLabel(team.goalDifference)}
                      </td>
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
