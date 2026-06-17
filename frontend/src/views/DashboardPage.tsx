'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { MatchCard } from '../components/MatchCard';
import { StandingsTable } from '../components/StandingsTable';
import { TopScorers } from '../components/TopScorers';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import type { FootballMatch } from '../types';

type Tab = 'jogos' | 'grupos' | 'conta';

export function DashboardPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('jogos');

  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [favoriteTeams, setFavoriteTeams] = useState<{ id: string; teamName: string }[]>([]);
  const [notifications, setNotifications] = useState(true);
  const [newTeam, setNewTeam] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [toast, setToast] = useState('');

  // WhatsApp
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappInput, setWhatsappInput] = useState('');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.getTodayMatches(),
      api.getUser(user.id),
    ]).then(([matchData, userData]) => {
      setMatches(matchData);
      setFavoriteTeams(userData.favoriteTeams);
      setNotifications(userData.preferences?.receiveDailyNotifications ?? true);
      setWhatsappEnabled(userData.preferences?.receiveWhatsappNotifications ?? false);
      const num = userData.preferences?.whatsappNumber ?? '';
      setWhatsappNumber(num);
      setWhatsappInput(num);
    }).finally(() => setLoadingData(false));
  }, [user]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

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
      showToast(newVal ? 'Notificações ativadas.' : 'Notificações desativadas.');
    } catch {
      showToast('Erro ao salvar.');
    }
  }

  async function handleSaveWhatsapp() {
    if (!user) return;
    setSavingWhatsapp(true);
    try {
      await api.updateWhatsapp(user.id, whatsappInput.trim() || null, whatsappEnabled);
      setWhatsappNumber(whatsappInput.trim());
      showToast('WhatsApp salvo!');
    } catch {
      showToast('Erro ao salvar WhatsApp.');
    } finally {
      setSavingWhatsapp(false);
    }
  }

  async function handleToggleWhatsapp() {
    if (!user) return;
    const newVal = !whatsappEnabled;
    setWhatsappEnabled(newVal);
    try {
      await api.updateWhatsapp(user.id, whatsappNumber || null, newVal);
      showToast(newVal ? 'Alertas WhatsApp ativados.' : 'Alertas WhatsApp desativados.');
    } catch {
      setWhatsappEnabled(!newVal);
      showToast('Erro ao salvar.');
    }
  }

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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 text-white text-sm px-5 py-2.5 rounded-full shadow-xl z-50">
          {toast}
        </div>
      )}

      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚽</span>
            <h1 className="text-yellow-500 font-black text-xl">GOALALERT</h1>
          </div>
          <div className="flex items-center gap-3">
            {user?.name && <span className="text-sm text-slate-400 hidden sm:block">{user.name}</span>}
            <button onClick={logout} className="text-sm text-slate-400 hover:text-white transition">
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-slate-800 bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          {(['jogos', 'grupos', 'conta'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition capitalize ${
                tab === t
                  ? 'border-yellow-500 text-yellow-500'
                  : 'border-transparent text-slate-500 hover:text-white'
              }`}
            >
              {t === 'jogos' ? 'Jogos de hoje' : t === 'grupos' ? 'Grupos' : 'Minha conta'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ABA JOGOS */}
        {tab === 'jogos' && (
          <>
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                  filter === 'all'
                    ? 'bg-yellow-500 text-black'
                    : 'border border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('favorites')}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                  filter === 'favorites'
                    ? 'bg-yellow-500 text-black'
                    : 'border border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                ⭐ Meus times
              </button>
            </div>

            {displayed.length === 0 ? (
              <EmptyState message={
                filter === 'favorites'
                  ? 'Nenhum time favorito joga hoje. Adicione times na aba "Minha conta".'
                  : 'Nenhuma partida encontrada para hoje.'
              } />
            ) : (
              <div className="space-y-6">
                {Object.entries(grouped).map(([championship, games]) => (
                  <div key={championship}>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                      {championship}
                    </h3>
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

        {/* ABA GRUPOS */}
        {tab === 'grupos' && (
          <div className="space-y-8">
            <StandingsTable />
            <TopScorers />
          </div>
        )}

        {/* ABA MINHA CONTA */}
        {tab === 'conta' && (
          <div className="space-y-4">

            {/* Emails diários */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white">Emails diários</h3>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Jogos dos seus times favoritos toda manhã
                  </p>
                </div>
                <button
                  onClick={handleToggleNotifications}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notifications ? 'bg-green-600' : 'bg-slate-700'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    notifications ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <span>📱</span> Alertas via WhatsApp
                  </h3>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Gols, início e fim de jogo dos seus times
                  </p>
                </div>
                <button
                  onClick={handleToggleWhatsapp}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    whatsappEnabled ? 'bg-green-600' : 'bg-slate-700'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    whatsappEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="tel"
                  value={whatsappInput}
                  onChange={e => setWhatsappInput(e.target.value)}
                  placeholder="Ex: 81999990000"
                  className="flex-1 p-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-green-600"
                />
                <button
                  onClick={handleSaveWhatsapp}
                  disabled={savingWhatsapp || whatsappInput === whatsappNumber}
                  className="px-4 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition"
                >
                  {savingWhatsapp ? '...' : 'Salvar'}
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Digite só os números com DDD, sem o +55. Ex: 81999990000
              </p>
            </div>

            {/* Times favoritos */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-bold text-white mb-1">Times favoritos</h3>
              <p className="text-sm text-slate-400 mb-4">
                Use o nome exato como aparece nos jogos.
              </p>

              <form onSubmit={handleAddTeam} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value)}
                  placeholder="Ex: Brasil, França..."
                  className="flex-1 p-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-yellow-600"
                />
                <button
                  type="submit"
                  disabled={!newTeam.trim()}
                  className="px-4 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-bold rounded-xl text-sm transition"
                >
                  Adicionar
                </button>
              </form>

              {favoriteTeams.length === 0 ? (
                <EmptyState message="Nenhum time adicionado ainda." />
              ) : (
                <ul className="space-y-2">
                  {favoriteTeams.map(team => (
                    <li
                      key={team.id}
                      className="flex items-center justify-between px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl"
                    >
                      <span className="text-sm font-semibold">{team.teamName}</span>
                      <button
                        onClick={() => handleRemoveTeam(team.teamName)}
                        className="text-xs text-red-400 hover:text-red-300 font-semibold transition"
                      >
                        Remover
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
