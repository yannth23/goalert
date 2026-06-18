'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { FootballMatch } from '../types';
import { PressureCard, computePressure, type PressureData } from './PressureCard';

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'PEN']);
const REFRESH_MS = 30_000;

export function AlertsTab() {
  const [pressureList, setPressureList] = useState<PressureData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  async function load() {
    try {
      const all: FootballMatch[] = await api.getTodayMatches();
      const live = all.filter((m) => LIVE_STATUSES.has(m.status));
      const computed = live
        .map(computePressure)
        .sort((a, b) => b.probability - a.probability);
      setPressureList(computed);
      setRefreshedAt(new Date());
    } catch {
      /* silent — user still sees last data */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-52 rounded-2xl bg-slate-800/60" />
        ))}
      </div>
    );
  }

  if (pressureList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl mb-4">📡</span>
        <p className="text-slate-400 font-semibold">Nenhum jogo ao vivo agora</p>
        <p className="text-slate-600 text-sm mt-1">
          Os alertas aparecem aqui quando há partidas em andamento
        </p>
      </div>
    );
  }

  const critical = pressureList.filter((d) => d.level === 'critical');
  const others   = pressureList.filter((d) => d.level !== 'critical');

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-black text-white text-lg">Alertas de pressão</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Probabilidade de gol nos próximos 5 minutos · atualiza a cada 30s
          </p>
        </div>
        {refreshedAt && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {refreshedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* How it works pill */}
      <div className="mb-6 p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
        <span className="text-xl shrink-0">💡</span>
        <p className="text-xs text-slate-400 leading-relaxed">
          A probabilidade é calculada com <strong className="text-slate-300">xG estimado</strong>,{' '}
          <strong className="text-slate-300">minuto da partida</strong>,{' '}
          <strong className="text-slate-300">situação do placar</strong> e ritmo de pressão.
          Quanto mais fatores ativos, maior a chance de gol antes do mercado fechar.
        </p>
      </div>

      {/* Critical alerts first */}
      {critical.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Alertas críticos
          </p>
          <div className="space-y-3">
            {critical.map((d) => (
              <PressureCard key={d.match.id} data={d} />
            ))}
          </div>
        </div>
      )}

      {/* Other live matches */}
      {others.length > 0 && (
        <div>
          {critical.length > 0 && (
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 mt-6">
              Outros jogos ao vivo
            </p>
          )}
          <div className="space-y-3">
            {others.map((d) => (
              <PressureCard key={d.match.id} data={d} />
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Legenda</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { dot: 'bg-slate-500',   label: 'Baixa',    range: '< 28%' },
            { dot: 'bg-yellow-500',  label: 'Média',    range: '28–44%' },
            { dot: 'bg-orange-500',  label: 'Alta',     range: '45–64%' },
            { dot: 'bg-red-500',     label: 'Crítica',  range: '≥ 65%' },
          ].map(({ dot, label, range }) => (
            <div key={label} className="flex items-center gap-2 text-slate-400">
              <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
              <span>{label} <span className="text-slate-600">{range}</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
