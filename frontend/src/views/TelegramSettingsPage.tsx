'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';
import { api } from '../lib/api';

export function TelegramSettingsPage() {
  const { user, isLoading } = useRequireAuth();

  const [enabled, setEnabled] = useState(false);
  const [savedChatId, setSavedChatId] = useState('');
  const [inputChatId, setInputChatId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    if (!user) return;
    api.getUser(user.id).then((data) => {
      const prefs = data.preferences;
      setEnabled(prefs?.receiveTelegramNotifications ?? false);
      setSavedChatId(prefs?.telegramChatId ?? '');
      setInputChatId(prefs?.telegramChatId ?? '');
    }).finally(() => setLoading(false));
  }, [user]);

  async function handleSave() {
    if (!user) return;
    if (!inputChatId.trim()) {
      showToast('Insira o seu Chat ID', false);
      return;
    }
    setSaving(true);
    try {
      await api.updateTelegram(user.id, inputChatId.trim(), enabled);
      setSavedChatId(inputChatId.trim());
      showToast('Telegram salvo! ✅');
    } catch {
      showToast('Erro ao salvar. Tente novamente.', false);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    if (!user) return;
    const next = !enabled;
    if (next && !savedChatId) {
      showToast('Salve seu Chat ID antes de ativar as notificações.', false);
      return;
    }
    setEnabled(next);
    try {
      await api.updateTelegram(user.id, savedChatId, next);
      showToast(next ? 'Alertas ativados! 🔔' : 'Alertas desativados.');
    } catch {
      setEnabled(!next);
      showToast('Erro ao salvar.', false);
    }
  }

  const chatIdChanged = inputChatId.trim() !== savedChatId;

  if (isLoading || loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <Toast toast={toast} successColor="bg-blue-600" />

      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 hover:text-white transition p-2 -ml-2 rounded-lg">
            ←
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl">✈️</span>
            <h1 className="font-black text-lg text-white">Alertas Telegram</h1>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Toggle */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-bold text-white text-base">Notificações em tempo real</h2>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                Receba mensagens no Telegram para todos os jogos da Copa do Mundo.
              </p>
            </div>
            <button
              onClick={handleToggle}
              className={`relative shrink-0 w-12 h-6 rounded-full transition-colors ${
                enabled ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                enabled ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>
          <div className={`mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            enabled && savedChatId ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${enabled && savedChatId ? 'bg-blue-400' : 'bg-slate-600'}`} />
            {enabled && savedChatId ? 'Ativo' : 'Inativo'}
          </div>
        </div>

        {/* Como configurar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-white text-base">Como configurar</h2>
          <ol className="space-y-2 text-sm text-slate-400">
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>Abra o Telegram e pesquise por <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-white text-xs">@WCGoalAlert_Bot</span></span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>Clique em <strong className="text-white">Iniciar</strong> ou envie <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-white text-xs">/start</span></span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span>O bot responde com seu <strong className="text-white">Chat ID</strong> — cole abaixo</span>
            </li>
          </ol>
          <p className="text-xs text-slate-500 pt-1">
            Alternativa: pesquise <span className="font-mono bg-slate-800 px-1 rounded">@userinfobot</span> no Telegram e envie qualquer mensagem.
          </p>
        </div>

        {/* Input Chat ID */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="font-bold text-white text-base">Seu Chat ID</h2>
            <p className="text-sm text-slate-400 mt-0.5">Número que o bot te enviou após o /start.</p>
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={inputChatId}
            onChange={(e) => setInputChatId(e.target.value)}
            placeholder="Ex: 387503207"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition font-mono"
          />
          <button
            onClick={handleSave}
            disabled={saving || !chatIdChanged}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition"
          >
            {saving ? 'Salvando…' : chatIdChanged ? 'Salvar Chat ID' : 'Chat ID salvo ✓'}
          </button>
        </div>

        {/* O que você vai receber */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="font-bold text-white text-base mb-4">O que você vai receber</h2>
          <ul className="space-y-3">
            {[
              { icon: '⚽', label: 'Início de jogo', desc: 'Quando o apito inicial tocar' },
              { icon: '🥅', label: 'GOL!', desc: 'Com placar atualizado em tempo real' },
              { icon: '🏁', label: 'Fim de jogo', desc: 'Resultado final da partida' },
              { icon: '📋', label: 'Resumo diário', desc: 'Jogos do dia logo de manhã' },
            ].map(({ icon, label, desc }) => (
              <li key={label} className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <Link href="/dashboard" className="block text-center text-sm text-slate-500 hover:text-white transition py-2">
          ← Voltar ao dashboard
        </Link>

      </div>
    </main>
  );
}
