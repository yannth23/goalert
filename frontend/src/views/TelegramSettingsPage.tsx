'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';
import { api } from '../lib/api';

export function TelegramSettingsPage() {
  const { user, isLoading } = useRequireAuth();
  const [savedChatId, setSavedChatId] = useState('');
  const [inputChatId, setInputChatId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    if (!user) return;
    api.getUser(user.id).then((data) => {
      const chatId = data.preferences?.telegramChatId ?? '';
      setSavedChatId(chatId);
      setInputChatId(chatId);
    }).catch(() => showToast('Erro ao carregar configurações.', false))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleSave() {
    if (!user) return;
    const trimmed = inputChatId.trim();
    if (!trimmed) {
      showToast('Insira o seu Chat ID', false);
      return;
    }
    setSaving(true);
    try {
      // Chat ID preenchido = notificações ativas automaticamente
      await api.updateTelegram(user.id, trimmed, true);
      setSavedChatId(trimmed);
      showToast('✅ Telegram ativado com sucesso!');
    } catch {
      showToast('Erro ao salvar. Tente novamente.', false);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!user) return;
    setSaving(true);
    try {
      await api.updateTelegram(user.id, null, false);
      setSavedChatId('');
      setInputChatId('');
      showToast('Telegram desvinculado.');
    } catch {
      showToast('Erro ao remover.', false);
    } finally {
      setSaving(false);
    }
  }

  const isActive = !!savedChatId;
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
          <Link href="/dashboard" className="text-slate-400 hover:text-white transition p-2 -ml-2 rounded-lg text-lg">
            ←
          </Link>
          <span className="text-xl">✈️</span>
          <h1 className="font-black text-lg text-white">Alertas via Telegram</h1>
          {isActive && (
            <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-blue-400 bg-blue-600/15 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Ativo
            </span>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">

        {/* Como configurar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="font-bold text-white">Como ativar</h2>
          <ol className="space-y-3">
            {[
              { n: 1, text: <>Abra o Telegram e pesquise <span className="font-mono bg-slate-800 text-white text-xs px-1.5 py-0.5 rounded">@WCGoalAlert_Bot</span></> },
              { n: 2, text: <>Toque em <strong className="text-white">Iniciar</strong> ou envie <span className="font-mono bg-slate-800 text-white text-xs px-1.5 py-0.5 rounded">/start</span></> },
              { n: 3, text: <>O bot responde com o seu <strong className="text-white">Chat ID</strong> — cole abaixo e pronto</> },
            ].map(({ n, text }) => (
              <li key={n} className="flex items-start gap-3 text-sm text-slate-400">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center mt-0.5">
                  {n}
                </span>
                <span className="leading-relaxed">{text}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Input Chat ID */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div>
            <label className="font-bold text-white text-sm block mb-1">Chat ID</label>
            <p className="text-xs text-slate-500">Número enviado pelo bot após o /start.</p>
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
            disabled={saving || !chatIdChanged || !inputChatId.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition"
          >
            {saving ? 'Salvando…' : isActive && !chatIdChanged ? '✓ Ativo — Chat ID salvo' : 'Ativar alertas'}
          </button>
          {isActive && (
            <button
              onClick={handleRemove}
              disabled={saving}
              className="w-full py-2 text-xs text-slate-500 hover:text-red-400 transition"
            >
              Desvincular Telegram
            </button>
          )}
        </div>

        {/* O que você vai receber */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="font-bold text-white text-sm mb-4">O que você vai receber</h2>
          <ul className="space-y-3">
            {[
              { icon: '⚽', label: 'Início de jogo', desc: 'Quando o apito inicial tocar' },
              { icon: '🥅', label: 'GOL!', desc: 'Placar atualizado em tempo real' },
              { icon: '🏁', label: 'Fim de jogo', desc: 'Resultado final da partida' },
              { icon: '📋', label: 'Resumo diário', desc: 'Jogos do dia logo de manhã' },
            ].map(({ icon, label, desc }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="text-xl w-8 text-center">{icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <Link href="/dashboard" className="block text-center text-xs text-slate-600 hover:text-slate-400 transition py-2">
          ← Voltar ao dashboard
        </Link>
      </div>
    </main>
  );
}
