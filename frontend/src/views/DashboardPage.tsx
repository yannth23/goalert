'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useToast } from '../hooks/useToast';
import { useGoalNotifications } from '../hooks/useGoalNotifications';
import { Toast } from '../components/Toast';
import { api } from '../lib/api';
import { MatchCard } from '../components/MatchCard';
import { StandingsTable } from '../components/StandingsTable';
import { TopScorers } from '../components/TopScorers';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import type { FootballMatch } from '../types';

type Tab = 'jogos' | 'grupos' | 'conta';

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
  const [notifications, setNotifications] = useState(true);
  const [newTeam, setNewTeam] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const { toast, showToast } = useToast();
  const goalNotifications = useGoalNotifications();
  const [telegramChatId, setTelegramChatId] = useState('');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.getTodayMatches(),
      api.getUser(user.id),
    ]).then(([matchData, userData]) => {
      setMatches(matchData);
      setFavoriteTeams(userData.favoriteTeams);
      setNotifications(userData.preferences?.receiveDailyNotifications ?? true);
      setTelegramChatId(userData.preferences?.telegramChatId ?? '');
    }).catch(() => {
      showToast('Erro ao carregar dados.');
    }).finally(() => setLoadingData(false));
  }, [user]);

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

  async function handleToggleNotifications() {
    if (!user) return;
    const newVal = !notifications;
    try {
      await api.updatePreferences(user.id, newVal);
      setNotifications(newVal);
      showToast(newVal ? 'Emails ativados.' : 'Emails desativados.');
    } catch {
      showToast('Erro ao salvar.');
    }
  }

  const displayName = user?.name
    ? user.name.split(' ').map(capitalize).join(' ')
    : '';

  const favoriteNames = favoriteTeams.map(t => t.teamName);
  const displayed = filter === 'favorites'
    ? matches.filter(m => favoriteNames.includes(m.team1) || favoriteNames.includes(m.team2))
    : matches;

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
            <span className="text-2xl">⚽</span>
            <span className="text-yellow-400 font-black text-xl tracking-tight group-hover:text-yellow-300 transition">
              GOALALERT
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
      <div className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 flex">
          {([
            { key: 'jogos', label: 'Jogos de hoje' },
            { key: 'grupos', label: 'Grupos' },
            { key: 'conta', label: 'Minha conta' },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-3.5 text-sm font-semibold border-b-2 transition-all ${
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

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ── ABA JOGOS ── */}
        {tab === 'jogos' && (
          <>
            <div className="flex gap-2 mb-5">
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

            {displayed.length === 0 ? (
              <EmptyState message={
                filter === 'favorites'
                  ? 'Nenhum time favorito joga hoje. Adicione na aba "Minha conta".'
                  : 'Nenhuma partida encontrada para hoje.'
              } />
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

            {/* Email diário */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-base">📧</div>
                  <div>
                    <p className="font-semibold text-white text-sm">Emails diários</p>
                    <p className="text-xs text-slate-500 mt-0.5">Resumo dos jogos toda manhã</p>
                  </div>
                </div>
                <button
                  onClick={handleToggleNotifications}
                  aria-label="Toggle emails"
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                    notifications ? 'bg-yellow-500' : 'bg-slate-700'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    notifications ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Notificações no navegador */}
            {goalNotifications.supported && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-base">🔔</div>
                    <div>
                      <p className="font-semibold text-white text-sm">Notificações no navegador</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {goalNotifications.permission === 'denied'
                          ? 'Bloqueado — habilite nas configurações'
                          : goalNotifications.enabled
                          ? 'Ativo · alertas de gol em tempo real'
                          : 'Alertas de gol direto no Chrome'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={goalNotifications.toggle}
                    disabled={goalNotifications.permission === 'denied'}
                    aria-label="Toggle browser notifications"
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                      goalNotifications.enabled ? 'bg-orange-500' : 'bg-slate-700'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      goalNotifications.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            )}

            {/* Telegram */}
            <Link
              href="/dashboard/telegram"
              className="flex items-center justify-between bg-slate-900 border border-slate-800 hover:border-blue-600/50 rounded-2xl p-5 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/15 flex items-center justify-center text-base">✈️</div>
                <div>
                  <p className="font-semibold text-sm text-white group-hover:text-blue-400 transition">
                    Alertas via Telegram
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {telegramChatId ? 'Ativo · gols e resultados em tempo real' : 'Toque para configurar'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {telegramChatId && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                <span className="text-slate-600 group-hover:text-slate-300 transition text-xl leading-none">›</span>
              </div>
            </Link>

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
