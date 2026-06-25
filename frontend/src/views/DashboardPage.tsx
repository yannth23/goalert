'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';
import { GoalAlertLogo } from '../components/GoalAlertLogo';
import { LiveTicker } from '../components/LiveTicker';
import { api } from '../lib/api';
import { MatchCard } from '../components/MatchCard';
import { StandingsTable } from '../components/StandingsTable';
import { TopScorers } from '../components/TopScorers';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import type { FootballMatch } from '../types';

type Tab = 'jogos' | 'grupos' | 'conta';
type StyleFilter = 'all' | 'pressing' | 'counter' | 'possession' | 'defensive';

const STYLE_OPTS: { key: StyleFilter; label: string; icon: string; active: string; inactive: string }[] = [
  { key: 'all',        label: 'Todos',        icon: '⚽', active: 'bg-slate-700 border-slate-600 text-white',            inactive: 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500' },
  { key: 'pressing',   label: 'Pressão',       icon: '🔥', active: 'bg-orange-950 border-orange-700 text-orange-400',     inactive: 'border-slate-700 text-slate-500 hover:border-orange-700 hover:text-orange-400' },
  { key: 'counter',    label: 'Contra-ataque',  icon: '⚡', active: 'bg-yellow-950 border-yellow-700 text-yellow-400',     inactive: 'border-slate-700 text-slate-500 hover:border-yellow-700 hover:text-yellow-400' },
  { key: 'possession', label: 'Posse',         icon: '🔵', active: 'bg-blue-950 border-blue-700 text-blue-400',           inactive: 'border-slate-700 text-slate-500 hover:border-blue-700 hover:text-blue-400' },
  { key: 'defensive',  label: 'Defensivo',     icon: '🛡️', active: 'bg-slate-800 border-slate-500 text-slate-300',        inactive: 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300' },
];

function matchHasStyle(m: FootballMatch, style: StyleFilter): boolean {
  if (style === 'all') return true;
  return m.tactics?.home?.dominanceStyle === style || m.tactics?.away?.dominanceStyle === style;
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function DashboardPage() {
  const { user, isLoading } = useRequireAuth();
  const { logout } = useAuth();
  const [tab, setTab] = useState<Tab>('jogos');

  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [favoriteTeams, setFavoriteTeams] = useState<{ id: string; teamName: string }[]>([]);
  const [newTeam, setNewTeam] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [styleFilter, setStyleFilter] = useState<StyleFilter>('all');
  const [syncing, setSyncing] = useState(false);
  const { toast, showToast } = useToast();

  // Busca inicial + polling a cada 30s
  useEffect(() => {
    if (!user) return;

    async function fetchMatches() {
      try {
        const matchData = await api.getTodayMatches();
        setMatches(matchData);
      } catch {
        // silencioso no polling
      }
    }

    async function fetchAll() {
      try {
        const [matchData, userData] = await Promise.all([
          api.getTodayMatches(),
          api.getUser(user!.id),
        ]);
        setMatches(matchData);
        setFavoriteTeams(userData.favoriteTeams);
      } catch {
        showToast('Erro ao carregar dados.');
      } finally {
        setLoadingData(false);
      }
    }

    fetchAll();
    const interval = setInterval(fetchMatches, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  // Auto-sync: se o banco estiver vazio após o carregamento, dispara um sync e re-busca
  useEffect(() => {
    if (loadingData || !user || matches.length > 0 || syncing) return;
    setSyncing(true);
    api.forceSync()
      .then(() => new Promise<void>(r => setTimeout(r, 3000)))
      .then(() => api.getTodayMatches())
      .then(data => { if (data.length > 0) setMatches(data); })
      .catch(() => {})
      .finally(() => setSyncing(false));
  }, [loadingData, matches.length, user]);

  async function handleAddTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeam.trim() || !user) return;
    try {
      const created = await api.addFavoriteTeam(user.id, newTeam.trim()) as { id: string; teamName: string };
      setFavoriteTeams(prev => [...prev, created]);
      setNewTeam('');
      showToast('Time adicionado!');
    } catch {
      showToast('Erro ao adicionar time.');
    }
  }

  async function handleRemoveTeam(teamName: string) {
    if (!user) return;
    try {
      await api.removeFavoriteTeam(user.id, teamName);
      setFavoriteTeams(prev => prev.filter(t => t.teamName !== teamName));
      showToast('Time removido.');
    } catch {
      showToast('Erro ao remover time.');
    }
  }

  const displayName = user?.name
    ? user.name.split(' ').map(capitalize).join(' ')
    : '';

  const favoriteNames = favoriteTeams.map(t => t.teamName);
  const hasTactics = matches.some(m => m.tactics);

  const displayed = matches
    .filter(m => filter === 'favorites' ? (favoriteNames.includes(m.team1) || favoriteNames.includes(m.team2)) : true)
    .filter(m => matchHasStyle(m, styleFilter));

  const grouped = displayed.reduce<Record<string, FootballMatch[]>>((acc, m) => {
    if (!acc[m.championship]) acc[m.championship] = [];
    acc[m.championship].push(m);
    return acc;
  }, {});

  if (isLoading || loadingData) return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loading />
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Toast toast={toast} successColor="bg-slate-800" />

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Logo — clicável volta para a landing */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <GoalAlertLogo size={30} />
            <span className="text-yellow-400 font-black text-xl tracking-tight group-hover:text-yellow-300 transition">
              TACTIQSENSE
            </span>
          </Link>

          {/* Lado direito — nome + sair separados */}
          <div className="flex items-center gap-4">
            {displayName && (
              <span className="text-sm font-medium text-slate-300 hidden sm:block truncate max-w-[140px]">
                {displayName}
              </span>
            )}
            <div className="w-px h-4 bg-slate-700 hidden sm:block" />
            <button
              onClick={logout}
              className="text-sm text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-slate-800"
            >
              Sair
            </button>
          </div>

        </div>
      </header>

      {/* ── Tabs ── */}
      <div className="border-b border-slate-800 overflow-x-auto scrollbar-hide">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 flex min-w-max sm:min-w-0">
          {([
            { key: 'jogos', label: 'Jogos' },
            { key: 'grupos', label: 'Grupos' },
            { key: 'conta', label: 'Conta' },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 sm:px-4 py-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                tab === key
                  ? 'border-yellow-400 text-yellow-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <LiveTicker />

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ── ABA JOGOS ── */}
        {tab === 'jogos' && (
          <>
            {/* Filtro: Todos / Meus times */}
            <div className="flex gap-2 mb-3">
              {([
                { key: 'all', label: 'Todos' },
                { key: 'favorites', label: '⭐ Meus times' },
              ] as { key: 'all' | 'favorites'; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                    filter === key
                      ? 'bg-yellow-400 text-black'
                      : 'border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Filtro por estilo tático — só quando há análise disponível */}
            {hasTactics && (
              <div className="mb-5 overflow-x-auto scrollbar-hide -mx-1 px-1">
                <div className="flex gap-2 min-w-max sm:min-w-0 sm:flex-wrap">
                  {STYLE_OPTS.map(opt => {
                    const base = filter === 'favorites'
                      ? matches.filter(m => favoriteNames.includes(m.team1) || favoriteNames.includes(m.team2))
                      : matches;
                    const count = opt.key === 'all'
                      ? base.length
                      : base.filter(m => matchHasStyle(m, opt.key)).length;
                    if (opt.key !== 'all' && count === 0) return null;
                    const isActive = styleFilter === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setStyleFilter(opt.key)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                          isActive ? opt.active : opt.inactive
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

            {displayed.length === 0 ? (
              syncing && styleFilter === 'all' && filter === 'all' ? (
                <div className="flex flex-col items-center gap-4 py-20 text-slate-400">
                  <svg className="animate-spin h-9 w-9 text-yellow-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-300">Buscando partidas de hoje...</p>
                    <p className="text-xs text-slate-500 mt-1">Isso pode levar alguns segundos</p>
                  </div>
                </div>
              ) : (
                <EmptyState message={
                  styleFilter !== 'all'
                    ? `Nenhuma partida com estilo "${STYLE_OPTS.find(o => o.key === styleFilter)?.label}" ${filter === 'favorites' ? 'nos seus times' : 'hoje'}.`
                    : filter === 'favorites'
                    ? 'Nenhum time favorito joga hoje. Adicione na aba "Conta".'
                    : 'Nenhuma partida encontrada para hoje.'
                } />
              )
            ) : (
              <div className="space-y-6">
                {Object.entries(grouped).map(([championship, games]) => (
                  <div key={championship}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">
                      {championship}
                    </p>
                    <div className="space-y-3">
                      {games.map(match => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          highlighted={
                            favoriteNames.includes(match.team1) ||
                            favoriteNames.includes(match.team2)
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── ABA GRUPOS ── */}
        {tab === 'grupos' && (
          <div className="space-y-8">
            <StandingsTable />
            <TopScorers />
          </div>
        )}

        {/* ── ABA MINHA CONTA ── */}
        {tab === 'conta' && (
          <div className="space-y-3 max-w-lg">

            {/* Cabeçalho da conta */}
            {displayName && (
              <div className="bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-2xl px-5 py-4 mb-2">
                <p className="text-xs text-yellow-500/70 font-semibold uppercase tracking-widest mb-0.5">Bem-vindo</p>
                <p className="text-lg font-black text-white">{displayName}</p>
              </div>
            )}

            {/* Times favoritos */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="mb-4">
                <p className="font-semibold text-white text-sm">Times favoritos</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Usado para filtrar jogos e destacar partidas.
                </p>
              </div>

              <form onSubmit={handleAddTeam} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value)}
                  placeholder="Ex: Brasil, França..."
                  className="flex-1 px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-yellow-500 transition"
                />
                <button
                  type="submit"
                  disabled={!newTeam.trim()}
                  className="px-4 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-black rounded-xl text-lg transition leading-none"
                >
                  +
                </button>
              </form>

              {favoriteTeams.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-3">Nenhum time adicionado ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {favoriteTeams.map(team => (
                    <li
                      key={team.id}
                      className="flex items-center justify-between px-3 py-2.5 bg-slate-800 border border-slate-700/40 rounded-xl"
                    >
                      <span className="text-sm font-medium text-white">{team.teamName}</span>
                      <button
                        onClick={() => handleRemoveTeam(team.teamName)}
                        className="text-xs text-slate-500 hover:text-red-400 transition font-medium"
                      >
                        remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        )}

      </div>
    </main>
  );
}

