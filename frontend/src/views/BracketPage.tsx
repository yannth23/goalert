'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

// Bandeiras (mantido o dicionário completo)
const FLAGS: Record<string, string> = {
  'Brasil': '🇧🇷', 'Argentina': '🇦🇷', 'França': '🇫🇷', 'Alemanha': '🇩🇪',
  'Espanha': '🇪🇸', 'Portugal': '🇵🇹', 'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Itália': '🇮🇹',
  'Holanda': '🇳🇱', 'Bélgica': '🇧🇪', 'Uruguai': '🇺🇾', 'Croácia': '🇭🇷',
  'Marrocos': '🇲🇦', 'Japão': '🇯🇵', 'Coreia do Sul': '🇰🇷', 'Estados Unidos': '🇺🇸',
  'México': '🇲🇽', 'Canadá': '🇨🇦', 'Senegal': '🇸🇳', 'Equador': '🇪🇨',
  'Colômbia': '🇨🇴', 'Suíça': '🇨🇭', 'Dinamarca': '🇩🇰', 'Polônia': '🇵🇱',
  'Austrália': '🇦🇺', 'Catar': '🇶🇦', 'Arábia Saudita': '🇸🇦', 'Irã': '🇮🇷',
  'Turquia': '🇹🇷', 'Ucrânia': '🇺🇦', 'Áustria': '🇦🇹', 'Suécia': '🇸🇪',
  'Noruega': '🇳🇴', 'Sérvia': '🇷🇸', 'Escócia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Haiti': '🇭🇹',
  'Costa do Marfim': '🇨🇮', 'Nigéria': '🇳🇬', 'Gana': '🇬🇭', 'Camarões': '🇨🇲',
  'Panamá': '🇵🇦', 'Peru': '🇵🇪', 'Chile': '🇨🇱', 'Venezuela': '🇻🇪',
  'Paraguai': '🇵🇾', 'Bolívia': '🇧🇴', 'Curaçao': '🇨🇼', 'Cabo Verde': '🇨🇻',
  'África do Sul': '🇿🇦', 'Tchéquia': '🇨🇿', 'Bósnia e Herzegovina': '🇧🇦',
  'Tunísia': '🇹🇳', 'Egito': '🇪🇬', 'Nova Zelândia': '🇳🇿', 'Iraque': '🇮🇶',
  'Argélia': '🇩🇿', 'Jordânia': '🇯🇴', 'RD Congo': '🇨🇩', 'Uzbequistão': '🇺🇿',
  // Inglês
  'Brazil': '🇧🇷', 'France': '🇫🇷', 'Germany': '🇩🇪', 'Spain': '🇪🇸',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Italy': '🇮🇹', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪',
  'Uruguay': '🇺🇾', 'Croatia': '🇭🇷', 'Morocco': '🇲🇦', 'South Korea': '🇰🇷',
  'United States': '🇺🇸', 'USA': '🇺🇸', 'Mexico': '🇲🇽', 'Senegal': '🇸🇳',
  'Ecuador': '🇪🇨', 'Colombia': '🇨🇴', 'Switzerland': '🇨🇭', 'Denmark': '🇩🇰',
  'Poland': '🇵🇱', 'Australia': '🇦🇺', 'Qatar': '🇶🇦', 'Saudi Arabia': '🇸🇦',
  'Iran': '🇮🇷', 'Turkey': '🇹🇷', 'Türkiye': '🇹🇷', 'Ukraine': '🇺🇦',
  'Austria': '🇦🇹', 'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Serbia': '🇷🇸',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Ivory Coast': '🇨🇮', 'Nigeria': '🇳🇬', 'Ghana': '🇬🇭',
  'Cameroon': '🇨🇲', 'Panama': '🇵🇦', 'Paraguay': '🇵🇾', 'Bolivia': '🇧🇴',
  'Cape Verde': '🇨🇻', 'South Africa': '🇿🇦',
  'Czech Republic': '🇨🇿', 'Czechia': '🇨🇿', 'Bosnia-Herzegovina': '🇧🇦',
  'Bosnia and Herzegovina': '🇧🇦', 'Tunisia': '🇹🇳', 'Egypt': '🇪🇬',
  'New Zealand': '🇳🇿', 'Iraq': '🇮🇶', 'Algeria': '🇩🇿', 'Jordan': '🇯🇴',
  'DR Congo': '🇨🇩', 'Congo DR': '🇨🇩', 'Uzbekistan': '🇺🇿',
};

// Grupos oficiais
const GROUPS: Record<string, string[]> = {
  'A': ['México', 'África do Sul', 'Coreia do Sul', 'Tchéquia'],
  'B': ['Canadá', 'Bósnia e Herzegovina', 'Catar', 'Suíça'],
  'C': ['Brasil', 'Marrocos', 'Haiti', 'Escócia'],
  'D': ['Estados Unidos', 'Paraguai', 'Austrália', 'Turquia'],
  'E': ['Alemanha', 'Curaçao', 'Costa do Marfim', 'Equador'],
  'F': ['Holanda', 'Japão', 'Suécia', 'Tunísia'],
  'G': ['Bélgica', 'Egito', 'Irã', 'Nova Zelândia'],
  'H': ['Espanha', 'Cabo Verde', 'Arábia Saudita', 'Uruguai'],
  'I': ['França', 'Senegal', 'Iraque', 'Noruega'],
  'J': ['Argentina', 'Argélia', 'Áustria', 'Jordânia'],
  'K': ['Portugal', 'RD Congo', 'Uzbequistão', 'Colômbia'],
  'L': ['Inglaterra', 'Croácia', 'Gana', 'Panamá'],
};

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: string;
  date: string;
}

interface TeamStats {
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

function getFlag(name: string): string {
  return FLAGS[name] || '🏳️';
}

function computeGroupTable(teams: string[], matches: Match[]): TeamStats[] {
  const table: Record<string, TeamStats> = {};
  teams.forEach(t => { table[t] = { teamName: t, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }; });

  matches.forEach(m => {
    if (m.status !== 'FT') return;
    if (!teams.includes(m.homeTeam) || !teams.includes(m.awayTeam)) return;
    if (m.homeScore === undefined || m.awayScore === undefined) return;

    const h = table[m.homeTeam];
    const a = table[m.awayTeam];
    if (!h || !a) return;

    h.played++; a.played++;
    h.goalsFor += m.homeScore; h.goalsAgainst += m.awayScore;
    a.goalsFor += m.awayScore; a.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) { h.wins++; h.points += 3; a.losses++; }
    else if (m.awayScore > m.homeScore) { a.wins++; a.points += 3; h.losses++; }
    else { h.draws++; h.points++; a.draws++; a.points++; }
  });

  Object.values(table).forEach(t => { t.goalDifference = t.goalsFor - t.goalsAgainst; });

  return Object.values(table).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName);
  });
}

function GroupTable({ name, teams, matches }: { name: string; teams: string[]; matches: Match[] }) {
  const table = computeGroupTable(teams, matches);
  const hasResults = matches.some(m => m.status === 'FT');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-3 py-2">
        <span className="text-xs font-black text-yellow-400 tracking-widest">GRUPO {name}</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="text-left px-2 py-1.5 text-slate-500 font-medium">Seleção</th>
            <th className="px-1.5 py-1.5 text-slate-500 font-medium text-center">J</th>
            <th className="px-1.5 py-1.5 text-slate-500 font-medium text-center">V</th>
            <th className="px-1.5 py-1.5 text-slate-500 font-medium text-center">E</th>
            <th className="px-1.5 py-1.5 text-slate-500 font-medium text-center">D</th>
            <th className="px-1.5 py-1.5 text-slate-500 font-medium text-center">SG</th>
            <th className="px-1.5 py-1.5 text-yellow-400 font-black text-center">Pts</th>
          </tr>
        </thead>
        <tbody>
          {table.map((t, i) => {
            const qualifies = i < 2;
            return (
              <tr key={t.teamName} className={`border-b border-slate-800/50 last:border-0 ${qualifies ? 'bg-emerald-950/20' : ''}`}>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-black w-4 ${qualifies ? 'text-emerald-400' : 'text-slate-600'}`}>{i + 1}</span>
                    <span className="text-sm">{getFlag(t.teamName)}</span>
                    <span className={`font-semibold ${qualifies ? 'text-white' : 'text-slate-400'}`}>{t.teamName}</span>
                  </div>
                </td>
                <td className="px-1.5 py-1.5 text-center text-slate-400">{t.played}</td>
                <td className="px-1.5 py-1.5 text-center text-slate-400">{t.wins}</td>
                <td className="px-1.5 py-1.5 text-center text-slate-400">{t.draws}</td>
                <td className="px-1.5 py-1.5 text-center text-slate-400">{t.losses}</td>
                <td className="px-1.5 py-1.5 text-center text-slate-400">{t.goalDifference >= 0 ? '+' : ''}{t.goalDifference}</td>
                <td className="px-1.5 py-1.5 text-center font-black text-white">{t.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!hasResults && (
        <div className="px-3 py-2 text-center text-[10px] text-slate-600 italic">
          Fase de grupos em andamento
        </div>
      )}
    </div>
  );
}

function KnockoutCard({ match }: { match: Match }) {
  const isLive = match.status === '1H' || match.status === 'HT' || match.status === '2H' || match.status === 'ET' || match.status === 'PEN';
  const isDone = match.status === 'FT';
  const homeWins = isDone && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWins = isDone && (match.awayScore ?? 0) > (match.homeScore ?? 0);

  return (
    <div className={`rounded-xl overflow-hidden border transition-all ${
      isLive ? 'border-yellow-500/70 shadow-lg shadow-yellow-900/20' : 'border-slate-700/50'
    }`}>
      {isLive && (
        <div className="bg-yellow-500 px-2 py-0.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
          <span className="text-[9px] font-black text-black uppercase tracking-wider">Ao Vivo</span>
        </div>
      )}
      <div className="bg-slate-900 divide-y divide-slate-800/60">
        {[
          { name: match.homeTeam, score: match.homeScore, wins: homeWins },
          { name: match.awayTeam, score: match.awayScore, wins: awayWins },
        ].map(({ name, score, wins }, i) => (
          <div key={i} className={`flex items-center justify-between px-3 py-2 ${wins ? 'bg-yellow-950/30' : ''}`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg leading-none">{getFlag(name)}</span>
              <span className={`text-xs font-semibold truncate ${wins ? 'text-yellow-400' : 'text-white'}`}>{name}</span>
            </div>
            <span className={`text-sm font-black tabular-nums ml-2 ${
              wins ? 'text-yellow-400' : isDone ? 'text-white' : 'text-slate-600'
            }`}>
              {score ?? '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BracketPage() {
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'grupos' | 'bracket'>('grupos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // Busca TODOS os jogos da Copa (não só do dia)
        const data = await api.getAllByCompetition('World Cup');
        const matches = data.map(m => ({
          id: m.id,
          homeTeam: m.team1,
          awayTeam: m.team2,
          homeScore: m.team1Score,
          awayScore: m.team2Score,
          status: m.status,
          date: m.date,
        }));
        setAllMatches(matches);
      } catch (err) {
        console.error('Erro ao carregar jogos:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  // Separa jogos: grupos (ambos times do mesmo grupo) vs mata-mata
  const groupMatches = allMatches.filter(m => {
    const homeInGroup = Object.entries(GROUPS).some(([, teams]) => teams.includes(m.homeTeam));
    const awayInGroup = Object.entries(GROUPS).some(([, teams]) => teams.includes(m.awayTeam));
    const sameGroup = Object.values(GROUPS).some(teams => teams.includes(m.homeTeam) && teams.includes(m.awayTeam));
    return homeInGroup && awayInGroup && sameGroup;
  });

  const knockoutMatches = allMatches.filter(m => {
    const sameGroup = Object.values(GROUPS).some(teams => teams.includes(m.homeTeam) && teams.includes(m.awayTeam));
    return !sameGroup;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-slate-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
        {[
          { key: 'grupos', label: '📋 Grupos' },
          { key: 'bracket', label: '🏆 Mata-Mata' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as 'grupos' | 'bracket')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === key ? 'bg-yellow-500 text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grupos */}
      {activeTab === 'grupos' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Object.entries(GROUPS).map(([name, teams]) => (
            <GroupTable
              key={name}
              name={name}
              teams={[...teams]}
              matches={groupMatches.filter(m =>
                teams.includes(m.homeTeam) && teams.includes(m.awayTeam)
              )}
            />
          ))}
        </div>
      )}

      {/* Mata-Mata */}
      {activeTab === 'bracket' && (
        <div>
          {knockoutMatches.length > 0 ? (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <h3 className="text-sm font-black text-yellow-400 uppercase tracking-widest">
                  Fase Eliminatória
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {knockoutMatches.length} jogo{knockoutMatches.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {knockoutMatches.map(match => (
                  <KnockoutCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <span className="text-5xl">🏆</span>
              <p className="text-white font-bold text-lg">Aguardando jogos da fase eliminatória</p>
              <p className="text-slate-500 text-sm max-w-xs">
                Os confrontos do mata-mata serão definidos conforme a fase de grupos avança.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
