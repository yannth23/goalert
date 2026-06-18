'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';
import { api } from '../lib/api';

type Step = 'loading' | 'setup' | 'saved';

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return digits;
}

export function WhatsappSettingsPage() {
  const { user, isLoading } = useRequireAuth();

  const [step, setStep] = useState<Step>('loading');
  const [enabled, setEnabled] = useState(false);
  const [savedNumber, setSavedNumber] = useState('');
  const [inputNumber, setInputNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    if (!user) return;
    api.getUser(user.id).then((data) => {
      const prefs = data.preferences;
      const num = prefs?.whatsappNumber ?? '';
      setEnabled(prefs?.receiveWhatsappNotifications ?? false);
      setSavedNumber(num);
      setInputNumber(num);
      setStep('setup');
    });
  }, [user]);

  async function handleSave() {
    if (!user) return;
    const digits = inputNumber.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) {
      showToast('Número inválido. Ex: 81999990000 (com DDD)', false);
      return;
    }
    setSaving(true);
    try {
      await api.updateWhatsapp(user.id, digits, enabled);
      setSavedNumber(digits);
      showToast('WhatsApp salvo com sucesso! ✅');
    } catch {
      showToast('Erro ao salvar. Tente novamente.', false);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    if (!user) return;
    const next = !enabled;
    setEnabled(next);
    try {
      await api.updateWhatsapp(user.id, savedNumber || null, next);
      showToast(next ? 'Alertas ativados! 🔔' : 'Alertas desativados.');
    } catch {
      setEnabled(!next);
      showToast('Erro ao salvar.', false);
    }
  }

  const numberChanged = inputNumber.replace(/\D/g, '') !== savedNumber;
  const hasNumber = savedNumber.length >= 10;

  if (isLoading || step === 'loading') {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <Toast toast={toast} successColor="bg-green-600" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-slate-400 hover:text-white transition p-2 -ml-2 rounded-lg"
          >
            ←
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl">📱</span>
            <h1 className="font-black text-lg text-white">Alertas WhatsApp</h1>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Status card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-bold text-white text-base">Notificações em tempo real</h2>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                Receba mensagens no WhatsApp quando seus times marcarem gol, começarem ou encerrarem uma partida.
              </p>
            </div>
            <button
              onClick={handleToggle}
              className={`relative shrink-0 w-12 h-6 rounded-full transition-colors ${
                enabled ? 'bg-green-600' : 'bg-slate-700'
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                enabled ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Status pill */}
          <div className={`mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            enabled && hasNumber
              ? 'bg-green-600/20 text-green-400'
              : 'bg-slate-800 text-slate-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${enabled && hasNumber ? 'bg-green-400' : 'bg-slate-600'}`} />
            {enabled && hasNumber ? 'Ativo' : 'Inativo'}
          </div>
        </div>

        {/* Phone number card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="font-bold text-white text-base">Número de WhatsApp</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Apenas os dígitos com DDD, sem o +55.
            </p>
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm select-none">
              🇧🇷 +55
            </span>
            <input
              type="tel"
              inputMode="numeric"
              value={inputNumber}
              onChange={(e) => setInputNumber(e.target.value)}
              placeholder="81999990000"
              maxLength={11}
              className="w-full pl-16 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-green-500 transition"
            />
          </div>

          {inputNumber.replace(/\D/g, '').length > 0 && (
            <p className="text-xs text-slate-500">
              Será salvo como: <span className="text-slate-300 font-mono">{formatPhone(inputNumber)}</span>
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !numberChanged}
            className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition"
          >
            {saving ? 'Salvando…' : numberChanged ? 'Salvar número' : 'Número salvo ✓'}
          </button>
        </div>

        {/* What you receive */}
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

        {/* Important note */}
        <div className="border border-yellow-500/30 bg-yellow-500/5 rounded-2xl p-4">
          <p className="text-xs text-yellow-400/80 leading-relaxed">
            <span className="font-bold text-yellow-400">Importante:</span> Os alertas são enviados apenas para os times que você marcou como favoritos. Adicione seus times na aba <strong>"Minha conta"</strong> do dashboard.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="block text-center text-sm text-slate-500 hover:text-white transition py-2"
        >
          ← Voltar ao dashboard
        </Link>

      </div>
    </main>
  );
}
