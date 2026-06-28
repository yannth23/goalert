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
  'Iraque': '🇮🇶', 'Argélia': '🇩🇿', 'Tchéquia': '🇨🇿', 'Azerbaijão': '🇦🇿',
};

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
  homeTeam: string;
  awayTeam: string;
  team1Score?: number;
  team2Score?: number;
  status: string;
  date: string;
}

interface TeamStats {
  p: number; w: number; d: number; l: number;
  gf: number; ga: number; pts: number;
}

function computeTable(teams: string[], matches: Match[]): Record<string, TeamStats> {
  const table: Record<string, TeamStats> = {};
  teams.forEach(t => { table[t] = { p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0 }; });
  matches.forEach(m => {
    const h = m.homeTeam, a = m.awayTeam;
    if (!table[h] || !table[a] || m.team1Score === undefined || m.team2Score === undefined) return;
    const hs = m.team1Score, as_ = m.team2Score;
    table[h].p++; table[a].p++;
    table[h].gf += hs; table[h].ga += as_;
    table[a].gf += as_; table[a].ga += hs;
    if (hs > as_)      { table[h].w++; table[h].pts += 3; table[a].l++; }
    else if (as_ > hs) { table[a].w++; table[a].pts += 3; table[h].l++; }
    else               { table[h].d++; table[h].pts++; table[a].d++; table[a].pts++; }
  });
  return table;
}

function GroupCard({ name, teams, matches }: { name: string; teams: string[]; matches: Match[] }) {
  const table = computeTable(teams, matches);
  const sorted = [...teams].sort((a, b) => {
    const ta = table[a], tb = table[b];
    if (tb.pts !== ta.pts) return tb.pts - ta.pts;
    return (tb.gf - tb.ga) - (ta.gf - ta.ga);
  });

  // Jogos do grupo hoje
  const todayGames = matches.filter(m =>
    teams.includes(m.homeTeam) && teams.includes(m.awayTeam)
  );
  const hasLive = todayGames.some(m => ['1H','HT','2H','ET','PEN'].includes(m.status));

  return (
    <div className={`rounded-2xl overflow-hidden border transition-all ${
      hasLive ? 'border-yellow-600/60 shadow-lg shadow-yellow-900/10' : 'border-slate-800'
    }`}>
      {/* Header */}
      <div className={`px-4 py-2.5 flex items-center justify-between ${
        hasLive ? 'bg-yellow-950/40' : 'bg-slate-900'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 font-black text-sm tracking-widest">GRUPO {name}</span>
          {hasLive && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-950/60 border border-yellow-800/50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              AO VIVO
            </span>
          )}
        </div>
        <span className="text-slate-600 text-xs">{todayGames.length > 0 ? `${todayGames.length} jogo(s) hoje` : ''}</span>
      </div>

      {/* Tabela */}
      <div className="bg-slate-950">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-0 px-3 py-1.5 border-b border-slate-800/50">
          <span className="text-[10px] text-slate-600 font-bold uppercase">Seleção</span>
          <span className="text-[10px] text-slate-600 font-bold uppercase text-center w-6">J</span>
          <span className="text-[10px] text-slate-600 font-bold uppercase text-center w-6">V</span>
          <span className="text-[10px] text-slate-600 font-bold uppercase text-center w-6">E</span>
          <span className="text-[10px] text-slate-600 font-bold uppercase text-center w-6">D</span>
          <span className="text-[10px] text-yellow-500 font-black uppercase text-center w-8">Pts</span>
        </div>

        {sorted.map((team, i) => {
          const t = table[team];
          const qualifies = i < 2;
          const flag = FLAGS[team] || '🏳️';
          const isPlaying = todayGames.some(m =>
            (m.homeTeam === team || m.awayTeam === team) &&
            ['1H','HT','2H','ET','PEN'].includes(m.status)
          );

          return (
            <div key={team} className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-0 px-3 py-2 border-b border-slate-800/30 last:border-0 items-center ${
              qualifies ? 'bg-emerald-950/10' : ''
            }`}>
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={`w-1 h-4 rounded-full shrink-0 ${qualifies ? 'bg-emerald-500' : 'bg-transparent'}`} />
                <span className="text-sm">{flag}</span>
                <span className={`text-xs font-semibold truncate ${
                  isPlaying ? 'text-yellow-400' : qualifies ? 'text-white' : 'text-slate-400'
                }`}>
                  {team}
                </span>
                {isPlaying && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse shrink-0" />}
              </div>
              <span className="text-[11px] text-slate-500 text-center w-6">{t?.p ?? 0}</span>
              <span className="text-[11px] text-slate-500 text-center w-6">{t?.w ?? 0}</span>
              <span className="text-[11px] text-slate-500 text-center w-6">{t?.d ?? 0}</span>
              <span className="text-[11px] text-slate-500 text-center w-6">{t?.l ?? 0}</span>
              <span className="text-[11px] font-black text-white text-center w-8">{t?.pts ?? 0}</span>
            </div>
          );
        })}

        {/* Jogos de hoje no grupo */}
        {todayGames.length > 0 && (
          <div className="border-t border-slate-800/50 px-3 py-2 space-y-1.5">
            {todayGames.map((m, i) => {
              const isLive = ['1H','HT','2H','ET','PEN'].includes(m.status);
              const isDone = m.status === 'FT';
              const time = new Date(m.date).toLocaleTimeString('pt-BR', {
                hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
              });
              return (
                <div key={i} className={`flex items-center justify-between text-xs rounded-lg px-2 py-1.5 ${
                  isLive ? 'bg-yellow-950/30' : 'bg-slate-900/50'
                }`}>
                  <span className={`font-semibold truncate max-w-[80px] ${isLive ? 'text-yellow-300' : 'text-slate-300'}`}>
                    {FLAGS[m.homeTeam] || ''} {m.homeTeam}
                  </span>
                  <div className="flex items-center gap-1 shrink-0 mx-1">
                    {isLive ? (
                      <span className="font-black text-yellow-400 tabular-nums">
                        {m.team1Score ?? 0} – {m.team2Score ?? 0}
                      </span>
                    ) : isDone ? (
                      <span className="font-black text-slate-300 tabular-nums">
                        {m.team1Score} – {m.team2Score}
                      </span>
                    ) : (
                      <span className="text-slate-500 font-bold">{time}</span>
                    )}
                  </div>
                  <span className={`font-semibold truncate max-w-[80px] text-right ${isLive ? 'text-yellow-300' : 'text-slate-300'}`}>
                    {m.awayTeam} {FLAGS[m.awayTeam] || ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function WorldCupSection() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

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

  const groupsWithGamesToday = Object.entries(GROUPS).filter(([, teams]) =>
    matches.some(m => teams.includes(m.homeTeam) && teams.includes(m.awayTeam))
  );

  const groupsWithoutGames = Object.entries(GROUPS).filter(([, teams]) =>
    !matches.some(m => teams.includes(m.homeTeam) && teams.includes(m.awayTeam))
  );

  const allGroups = [...groupsWithGamesToday, ...groupsWithoutGames];

  return (
    <section id="grupos" className="px-4 py-12">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">
              🏆 Fase de Grupos
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">Copa do Mundo FIFA 2026 · 12 grupos · 48 seleções</p>
          </div>
          {groupsWithGamesToday.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-bold text-yellow-400 bg-yellow-950/40 border border-yellow-800/50 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              {groupsWithGamesToday.length} grupo(s) ao vivo
            </div>
          )}
        </div>

        {/* Filtro rápido de grupos */}
        <div className="flex gap-1.5 mb-5 flex-wrap">
          <button
            onClick={() => setActiveGroup(null)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
              activeGroup === null ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          {Object.keys(GROUPS).map(g => {
            const hasGame = matches.some(m =>
              GROUPS[g].includes(m.homeTeam) && GROUPS[g].includes(m.awayTeam)
            );
            return (
              <button
                key={g}
                onClick={() => setActiveGroup(g === activeGroup ? null : g)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                  activeGroup === g
                    ? 'bg-yellow-500 text-black'
                    : hasGame
                    ? 'bg-yellow-950/40 border border-yellow-800/40 text-yellow-400 hover:bg-yellow-950/60'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>

        {/* Grid de grupos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allGroups
            .filter(([g]) => !activeGroup || g === activeGroup)
            .map(([name, teams]) => (
              <GroupCard
                key={name}
                name={name}
                teams={teams}
                matches={matches.filter(m =>
                  teams.includes(m.homeTeam) && teams.includes(m.awayTeam)
                )}
              />
            ))}
        </div>

        {/* Legenda */}
        <div className="mt-4 flex items-center gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-4 rounded-full bg-emerald-500" />
            <span>Classificado para mata-mata</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span>Jogando agora</span>
          </div>
        </div>
      </div>
    </section>
  );
}
