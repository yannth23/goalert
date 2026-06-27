'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const FLAGS: Record<string, string> = {
  'Brasil': '🇧🇷', 'Argentina': '🇦🇷', 'França': '🇫🇷', 'Alemanha': '🇩🇪',
  'Espanha': '🇪🇸', 'Portugal': '🇵🇹', 'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Itália': '🇮🇹',
  'Holanda': '🇳🇱', 'Bélgica': '🇧🇪', 'Uruguai': '🇺🇾', 'Croácia': '🇭🇷',
  'Marrocos': '🇲🇦', 'Japão': '🇯🇵', 'Coreia do Sul': '🇰🇷', 'EUA': '🇺🇸',
  'México': '🇲🇽', 'Canadá': '🇨🇦', 'Senegal': '🇸🇳', 'Equador': '🇪🇨',
  'Colômbia': '🇨🇴', 'Suíça': '🇨🇭', 'Dinamarca': '🇩🇰', 'Polônia': '🇵🇱',
  'Austrália': '🇦🇺', 'Catar': '🇶🇦', 'Arábia Saudita': '🇸🇦', 'Irã': '🇮🇷',
  'Turquia': '🇹🇷', 'Ucrânia': '🇺🇦', 'Áustria': '🇦🇹', 'Suécia': '🇸🇪',
  'Noruega': '🇳🇴', 'Sérvia': '🇷🇸', 'Escócia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Haiti': '🇭🇹',
  'Costa do Marfim': '🇨🇮', 'Nigéria': '🇳🇬', 'Gana': '🇬🇭', 'Camarões': '🇨🇲',
  'Panamá': '🇵🇦', 'Peru': '🇵🇪', 'Chile': '🇨🇱', 'Venezuela': '🇻🇪',
  'Paraguai': '🇵🇾', 'Bolívia': '🇧🇴', 'Curaçau': '🇨🇼', 'Cabo Verde': '🇨🇻',
};

// Grupos da Copa do Mundo 2026 (48 seleções, 12 grupos de 4)
const GROUPS: Record<string, string[]> = {
  'A': ['EUA', 'Panamá', 'Bolívia', 'Argélia'],
  'B': ['Argentina', 'Chile', 'Peru', 'Canadá'],
  'C': ['Brasil', 'Colômbia', 'Equador', 'Catar'],
  'D': ['Espanha', 'Croácia', 'Marrocos', 'Azerbaijão'],
  'E': ['França', 'Bélgica', 'Itália', 'Camarões'],
  'F': ['Portugal', 'Polônia', 'Tchéquia', 'Iraque'],
  'G': ['Alemanha', 'Japão', 'EUA', 'Arábia Saudita'],
  'H': ['Inglaterra', 'Sérvia', 'Escócia', 'Senegal'],
  'I': ['Holanda', 'Dinamarca', 'Áustria', 'Nigéria'],
  'J': ['Uruguai', 'Noruega', 'Suíça', 'Costa do Marfim'],
  'K': ['Coreia do Sul', 'Austrália', 'Irã', 'Gana'],
  'L': ['México', 'Ucrânia', 'Turquia', 'Cabo Verde'],
};

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  team1Score?: number;
  team2Score?: number;
  status: string;
  date: string;
  championship: string;
}

interface KnockoutMatch {
  home: string;
  away: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  round: string;
}

function TeamRow({ name, score, isWinner }: { name: string; score?: number; isWinner?: boolean }) {
  const flag = FLAGS[name] || '🏳️';
  return (
    <div className={`flex items-center justify-between px-2.5 py-1.5 transition-colors ${
      isWinner ? 'bg-yellow-950/40' : ''
    }`}>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm">{flag}</span>
        <span className={`text-xs font-semibold truncate ${isWinner ? 'text-yellow-400' : 'text-slate-300'}`}>
          {name || 'A definir'}
        </span>
      </div>
      <span className={`text-xs font-black ml-2 shrink-0 ${
        isWinner ? 'text-yellow-400' : score !== undefined ? 'text-white' : 'text-slate-600'
      }`}>
        {score !== undefined ? score : '—'}
      </span>
    </div>
  );
}

function KnockoutCard({ match }: { match: KnockoutMatch }) {
  const isLive = match.status === '1H' || match.status === 'HT' || match.status === '2H' || match.status === 'ET' || match.status === 'PEN';
  const isDone = match.status === 'FT';
  const homeWins = isDone && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWins = isDone && (match.awayScore ?? 0) > (match.homeScore ?? 0);

  return (
    <div className={`rounded-xl overflow-hidden border transition-all ${
      isLive ? 'border-yellow-600/50 shadow-lg shadow-yellow-900/20' : 'border-slate-700/50'
    }`} style={{ minWidth: 160 }}>
      {isLive && (
        <div className="bg-yellow-500 px-2 py-0.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
          <span className="text-[9px] font-black text-black uppercase tracking-wider">Ao Vivo</span>
        </div>
      )}
      <div className="bg-slate-900 divide-y divide-slate-800">
        <TeamRow name={match.home} score={match.homeScore} isWinner={homeWins} />
        <TeamRow name={match.away} score={match.awayScore} isWinner={awayWins} />
      </div>
    </div>
  );
}

function GroupTable({ name, teams, matches }: {
  name: string;
  teams: string[];
  matches: Match[];
}) {
  // Calcular tabela do grupo
  const table: Record<string, { p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }> = {};
  teams.forEach(t => { table[t] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });

  matches.forEach(m => {
    const h = m.homeTeam, a = m.awayTeam;
    if (!table[h] || !table[a]) return;
    if (m.team1Score === undefined || m.team2Score === undefined) return;
    const hs = m.team1Score, as_ = m.team2Score;
    table[h].p++; table[a].p++;
    table[h].gf += hs; table[h].ga += as_;
    table[a].gf += as_; table[a].ga += hs;
    if (hs > as_) { table[h].w++; table[h].pts += 3; table[a].l++; }
    else if (as_ > hs) { table[a].w++; table[a].pts += 3; table[h].l++; }
    else { table[h].d++; table[h].pts++; table[a].d++; table[a].pts++; }
  });

  const sorted = teams.sort((a, b) => {
    const ta = table[a], tb = table[b];
    if (!ta || !tb) return 0;
    if (tb.pts !== ta.pts) return tb.pts - ta.pts;
    return (tb.gf - tb.ga) - (ta.gf - ta.ga);
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-3 py-2 flex items-center gap-2">
        <span className="text-xs font-black text-yellow-400 wc-title tracking-widest">GRUPO {name}</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="text-left px-2 py-1.5 text-slate-500 font-medium w-full">Seleção</th>
            <th className="px-1.5 py-1.5 text-slate-500 font-medium text-center">P</th>
            <th className="px-1.5 py-1.5 text-slate-500 font-medium text-center">V</th>
            <th className="px-1.5 py-1.5 text-slate-500 font-medium text-center">E</th>
            <th className="px-1.5 py-1.5 text-slate-500 font-medium text-center">D</th>
            <th className="px-1.5 py-1.5 text-slate-500 font-medium text-center">SG</th>
            <th className="px-1.5 py-1.5 text-yellow-400 font-black text-center">Pts</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((team, i) => {
            const t = table[team];
            const flag = FLAGS[team] || '🏳️';
            const qualifies = i < 2;
            return (
              <tr key={team} className={`border-b border-slate-800/50 last:border-0 ${qualifies ? 'bg-emerald-950/20' : ''}`}>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-black w-4 ${qualifies ? 'text-emerald-400' : 'text-slate-600'}`}>{i + 1}</span>
                    <span className="text-sm">{flag}</span>
                    <span className={`font-semibold ${qualifies ? 'text-white' : 'text-slate-400'}`}>{team}</span>
                  </div>
                </td>
                <td className="px-1.5 py-1.5 text-center text-slate-400">{t?.p ?? 0}</td>
                <td className="px-1.5 py-1.5 text-center text-slate-400">{t?.w ?? 0}</td>
                <td className="px-1.5 py-1.5 text-center text-slate-400">{t?.d ?? 0}</td>
                <td className="px-1.5 py-1.5 text-center text-slate-400">{t?.l ?? 0}</td>
                <td className="px-1.5 py-1.5 text-center text-slate-400">{((t?.gf ?? 0) - (t?.ga ?? 0)) >= 0 ? '+' : ''}{(t?.gf ?? 0) - (t?.ga ?? 0)}</td>
                <td className="px-1.5 py-1.5 text-center font-black text-white">{t?.pts ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function BracketPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'grupos' | 'bracket'>('grupos');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getTodayMatches();
        setMatches(data as Match[]);
      } catch {}
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  // Jogos de mata-mata detectados pelo status/fase
  const knockoutMatches: KnockoutMatch[] = matches
    .filter(m => !Object.values(GROUPS).flat().includes(m.homeTeam))
    .map(m => ({
      home: m.homeTeam,
      away: m.awayTeam,
      homeScore: m.team1Score,
      awayScore: m.team2Score,
      status: m.status,
      round: 'Oitavas',
    }));

  return (
    <div className="space-y-6">

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
        {[
          { key: 'grupos', label: '📋 Grupos' },
          { key: 'bracket', label: '🏆 Chaveamento' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as 'grupos' | 'bracket')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === key
                ? 'bg-yellow-500 text-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* GRUPOS */}
      {activeTab === 'grupos' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Object.entries(GROUPS).map(([name, teams]) => (
            <GroupTable
              key={name}
              name={name}
              teams={[...teams]}
              matches={matches.filter(m =>
                teams.includes(m.homeTeam) && teams.includes(m.awayTeam)
              )}
            />
          ))}
        </div>
      )}

      {/* CHAVEAMENTO */}
      {activeTab === 'bracket' && (
        <div>
          {knockoutMatches.length > 0 ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black text-yellow-400 uppercase tracking-widest mb-3">Oitavas de Final</h3>
                <div className="grid grid-cols-2 gap-3">
                  {knockoutMatches.map((m, i) => (
                    <KnockoutCard key={i} match={m} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <span className="text-5xl">🏆</span>
              <p className="text-white font-bold text-lg">Fase de Grupos em andamento</p>
              <p className="text-slate-500 text-sm max-w-xs">
                O chaveamento do mata-mata será atualizado automaticamente quando a fase de grupos terminar.
              </p>
              <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl p-4 text-left space-y-2 w-full max-w-xs">
                <p className="text-xs font-black text-yellow-400 uppercase tracking-widest">Formato Copa 2026</p>
                <div className="space-y-1 text-xs text-slate-400">
                  <p>📋 12 grupos de 4 times</p>
                  <p>🏃 Top 2 de cada grupo + 8 melhores 3os</p>
                  <p>⚔️ 32 times no mata-mata</p>
                  <p>🏆 Oitavas → Quartas → Semi → Final</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
