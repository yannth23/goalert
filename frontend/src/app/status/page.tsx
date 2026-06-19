'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, SystemStatus } from '@/lib/api';

const REFRESH_MS = 30_000;

const SOURCE_CONFIG = {
  primary:   { label: 'football-data.org', icon: '🟢', badge: 'bg-green-900/60 text-green-400 border-green-800/60',  dot: 'bg-green-400',  ring: 'ring-green-700/40' },
  sofascore: { label: 'SofaScore (fallback 1)', icon: '🟡', badge: 'bg-yellow-900/60 text-yellow-400 border-yellow-800/60', dot: 'bg-yellow-400', ring: 'ring-yellow-700/40' },
  espn:      { label: 'ESPN (fallback 2)',  icon: '🟠', badge: 'bg-orange-900/60 text-orange-400 border-orange-800/60', dot: 'bg-orange-400', ring: 'ring-orange-700/40' },
  none:      { label: 'Sem fonte — falha total', icon: '🔴', badge: 'bg-red-900/60 text-red-400 border-red-800/60',  dot: 'bg-red-400',    ring: 'ring-red-700/40' },
} as const;

function timeAgo(isoStr: string): string {
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diff < 5)   return 'agora mesmo';
  if (diff < 60)  return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
  return `${Math.floor(diff / 3600)} h atrás`;
}

export default function StatusPage() {
  const router = useRouter();
  const [status, setStatus]     = useState<SystemStatus | null>(null);
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState(false);
  const [syncMsg, setSyncMsg]   = useState<string | null>(null);
  const [refreshAt, setRefreshAt] = useState<Date | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const data = await api.getSystemStatus();
      setStatus(data);
      setRefreshAt(new Date());
      setError(null);
    } catch (e: any) {
      if (e.message?.includes('401') || e.message?.toLowerCase().includes('unauthorized')) {
        router.replace('/');
      } else {
        setError(e.message ?? 'Erro ao buscar status');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/'); return; }
    fetch();
    const t = setInterval(fetch, REFRESH_MS);
    return () => clearInterval(t);
  }, [fetch, router]);

  async function forceSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await api.forceSync();
      setSyncMsg(`✅ Sync completo — ${r.synced} partidas, ${r.live} ao vivo [${r.source}]`);
      await fetch();
    } catch (e: any) {
      setSyncMsg(`❌ Falhou: ${e.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 6000);
    }
  }

  const src = (status?.lastSync?.source ?? 'none') as keyof typeof SOURCE_CONFIG;
  const srcCfg = SOURCE_CONFIG[src] ?? SOURCE_CONFIG.none;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Carregando status…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => router.back()}
                className="text-slate-600 hover:text-slate-400 text-sm transition"
              >
                ← Voltar
              </button>
            </div>
            <h1 className="text-2xl font-black text-white">🔧 Status do Sistema</h1>
            <p className="text-xs text-slate-500 mt-1">
              GoalAlert · atualiza a cada 30s
              {refreshAt && (
                <> · última leitura: {refreshAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</>
              )}
            </p>
          </div>
          <button
            onClick={forceSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-300 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <><span className="w-3 h-3 rounded-full border-2 border-slate-500 border-t-white animate-spin" />Sincronizando…</>
            ) : (
              <><span>⚡</span>Forçar Sync</>
            )}
          </button>
        </div>

        {syncMsg && (
          <div className="mb-5 p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300">
            {syncMsg}
          </div>
        )}

        {/* Current source — big card */}
        <div className={`rounded-2xl border p-5 mb-4 ${srcCfg.ring} ring-1 bg-slate-900 border-slate-800`}>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Fonte de dados ativa</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${srcCfg.dot} ${src !== 'none' ? 'animate-pulse' : ''}`} />
              <span className="text-lg font-black text-white">{srcCfg.label}</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${srcCfg.badge}`}>
              {src === 'primary' ? 'Normal' : src === 'none' ? 'Falha total' : 'Fallback ativo'}
            </span>
          </div>
          {src !== 'primary' && src !== 'none' && (
            <p className="text-xs text-yellow-600 mt-2">
              ⚠️ API principal indisponível — usando fonte de redundância
            </p>
          )}
          {src === 'none' && (
            <p className="text-xs text-red-500 mt-2">
              🚨 Todas as fontes falharam — dados podem estar desatualizados
            </p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">

          {/* Last sync */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Última sincronização</p>
            {status?.lastSync ? (
              <>
                <p className="text-2xl font-black text-white">{timeAgo(status.lastSync.ts)}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(status.lastSync.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
                <div className="mt-2 space-y-0.5 text-xs text-slate-400">
                  <div>Partidas: <span className="text-white font-semibold">{status.lastSync.synced}</span></div>
                  <div>Ao vivo: <span className="text-green-400 font-semibold">{status.lastSync.live}</span></div>
                  <div>Erros: <span className={status.lastSync.errors > 0 ? 'text-red-400 font-semibold' : 'text-white font-semibold'}>{status.lastSync.errors}</span></div>
                </div>
              </>
            ) : (
              <p className="text-slate-600 text-sm">Nenhum sync registrado ainda</p>
            )}
          </div>

          {/* Matches */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Jogos hoje</p>
            <p className="text-2xl font-black text-white">{status?.matches?.total ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">total no banco</p>
            <div className="mt-3 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${(status?.matches?.live ?? 0) > 0 ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-sm font-bold text-white">{status?.matches?.live ?? 0}</span>
              <span className="text-xs text-slate-500">ao vivo agora</span>
            </div>
          </div>

        </div>

        {/* Infrastructure */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-4">Infraestrutura</p>
          <div className="space-y-3">

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span>Redis (Upstash)</span>
              </div>
              <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${status?.redis?.connected ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status?.redis?.connected ? 'bg-green-400' : 'bg-red-400'}`} />
                {status?.redis?.connected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Erros hoje</span>
              <span className={`text-sm font-black ${(status?.errorsToday ?? 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {status?.errorsToday ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Falhas consecutivas</span>
              <span className={`text-sm font-black ${(status?.consecutiveFailures ?? 0) > 2 ? 'text-red-400' : (status?.consecutiveFailures ?? 0) > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                {status?.consecutiveFailures ?? 0}
              </span>
            </div>

            {status?.serverTime && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Hora do servidor</span>
                <span className="text-xs text-slate-500 font-mono">
                  {new Date(status.serverTime).toLocaleTimeString('pt-BR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC
                </span>
              </div>
            )}

          </div>
        </div>

        {/* Data source chain */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-4">Cadeia de redundância</p>
          <div className="space-y-3">
            {(['primary','sofascore','espn'] as const).map((s, i) => {
              const cfg = SOURCE_CONFIG[s];
              const isActive = src === s;
              return (
                <div key={s} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isActive ? `${cfg.badge} border` : 'bg-slate-800/30 border-slate-800/50'}`}>
                  <span className="text-slate-500 text-xs w-4">{i + 1}</span>
                  <span className={`w-2 h-2 rounded-full ${isActive ? cfg.dot : 'bg-slate-700'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${isActive ? '' : 'text-slate-400'}`}>
                      {cfg.label}
                    </p>
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">Ativo</span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-700 mt-4 leading-relaxed">
            O sistema tenta a próxima fonte automaticamente quando a atual falha. Resultados do fallback são cacheados no Redis por 90 segundos.
          </p>
        </div>

      </div>
    </div>
  );
}
