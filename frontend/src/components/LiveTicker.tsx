'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { FootballMatch } from '../types';

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'PEN']);
const REFRESH_MS = 30_000;

const FLAGS: Record<string, string> = {
  'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'France': '🇫🇷', 'Germany': '🇩🇪',
  'Spain': '🇪🇸', 'Portugal': '🇵🇹', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'United States': '🇺🇸',
  'Mexico': '🇲🇽', 'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Morocco': '🇲🇦',
  'Nigeria': '🇳🇬', 'Senegal': '🇸🇳', 'Croatia': '🇭🇷', 'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪', 'Uruguay': '🇺🇾', 'Italy': '🇮🇹', 'Switzerland': '🇨🇭',
  'Denmark': '🇩🇰', 'Australia': '🇦🇺', 'Canada': '🇨🇦', 'Ecuador': '🇪🇨',
  'Ghana': '🇬🇭', 'Qatar': '🇶🇦', 'Poland': '🇵🇱', 'Tunisia': '🇹🇳',
  'Cameroon': '🇨🇲', 'Costa Rica': '🇨🇷', 'Serbia': '🇷🇸', 'Iran': '🇮🇷',
  'Saudi Arabia': '🇸🇦', 'Colombia': '🇨🇴', 'Chile': '🇨🇱', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Norway': '🇳🇴', 'Ukraine': '🇺🇦', 'Hungary': '🇭🇺', 'Algeria': '🇩🇿',
  'Indonesia': '🇮🇩', 'Slovenia': '🇸🇮', 'Iraq': '🇮🇶', 'Sweden': '🇸🇪',
  'Austria': '🇦🇹', 'New Zealand': '🇳🇿', 'Egypt': '🇪🇬',
  "Côte d'Ivoire": '🇨🇮', 'Ivory Coast': '🇨🇮', 'South Africa': '🇿🇦',
  'Türkiye': '🇹🇷', 'Turkey': '🇹🇷',
};

const TEAM_PT: Record<string, string> = {
  'Mexico': 'México', 'South Korea': 'Coreia do Sul',
  'Czech Republic': 'Rep. Tcheca', 'Czechia': 'Rep. Tcheca',
  'South Africa': 'África do Sul', 'Switzerland': 'Suíça', 'Canada': 'Canadá',
  'Serbia': 'Sérvia', 'Bosnia and Herzegovina': 'Bósnia',
  'Scotland': 'Escócia', 'Morocco': 'Marrocos', 'Brazil': 'Brasil',
  'United States': 'EUA', 'Australia': 'Austrália',
  'Türkiye': 'Turquia', 'Turkey': 'Turquia', 'Netherlands': 'Holanda',
  'Germany': 'Alemanha', 'Japan': 'Japão', 'Belgium': 'Bélgica',
  'Costa Rica': 'Costa Rica', 'Argentina': 'Argentina', 'Egypt': 'Egito',
  'New Zealand': 'Nova Zelândia', 'Spain': 'Espanha', 'France': 'França',
  'Uruguay': 'Uruguai', 'England': 'Inglaterra', 'Colombia': 'Colômbia',
  'Saudi Arabia': 'Arábia Saudita', 'Iran': 'Irã', 'Nigeria': 'Nigéria',
  'Croatia': 'Croácia', 'Denmark': 'Dinamarca', 'Ecuador': 'Equador',
  'Italy': 'Itália', 'Norway': 'Noruega', 'Iraq': 'Iraque',
  'Poland': 'Polônia', 'Ukraine': 'Ucrânia', 'Hungary': 'Hungria',
  'Algeria': 'Argélia', 'Cameroon': 'Camarões', 'Ghana': 'Gana',
  'Indonesia': 'Indonésia', 'Slovenia': 'Eslovênia', 'Sweden': 'Suécia',
  'Qatar': 'Catar', 'Tunisia': 'Tunísia', 'Ivory Coast': 'Costa do Marfim',
  "Côte d'Ivoire": 'Costa do Marfim',
};

const STATUS_LABEL: Record<string, string> = {
  '1H': '1º T', 'HT': 'Intervalo', '2H': '2º T', 'ET': 'Prorrog.', 'PEN': 'Pênaltis',
};

function playGoalSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [
      { freq: 784, t: 0 },
      { freq: 988, t: 0.14 },
      { freq: 1175, t: 0.28 },
      { freq: 1568, t: 0.42 },
    ];
    notes.forEach(({ freq, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.22);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.25);
    });
  } catch { /* AudioContext blocked or unavailable */ }
}

interface GoalFlash {
  matchId: string;
  scorer: string; // e.g. "Brasil 2–1 França"
}

export function LiveTicker() {
  const [liveMatches, setLiveMatches] = useState<FootballMatch[]>([]);
  const [goalFlash, setGoalFlash] = useState<GoalFlash | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const prevScores = useRef<Record<string, { t1: number; t2: number }>>({});
  const flashTimeout = useRef<ReturnType<typeof setTimeout>>();

  async function fetchAndDetect() {
    try {
      const all: FootballMatch[] = await api.getTodayMatches();
      const live = all.filter((m) => LIVE_STATUSES.has(m.status));

      for (const m of live) {
        const prev = prevScores.current[m.id];
        const t1 = m.team1Score ?? 0;
        const t2 = m.team2Score ?? 0;

        if (prev && (t1 > prev.t1 || t2 > prev.t2)) {
          const name1 = TEAM_PT[m.team1] ?? m.team1;
          const name2 = TEAM_PT[m.team2] ?? m.team2;
          playGoalSound();
          clearTimeout(flashTimeout.current);
          setGoalFlash({
            matchId: m.id,
            scorer: `${name1} ${t1}–${t2} ${name2}`,
          });
          flashTimeout.current = setTimeout(() => setGoalFlash(null), 4000);
        }

        prevScores.current[m.id] = { t1, t2 };
      }

      setLiveMatches(live);
      setRefreshedAt(new Date());
    } catch { /* silent — don't disrupt the page */ }
  }

  useEffect(() => {
    fetchAndDetect();
    const timer = setInterval(fetchAndDetect, REFRESH_MS);
    return () => {
      clearInterval(timer);
      clearTimeout(flashTimeout.current);
    };
  }, []);

  if (!liveMatches.length) return null;

  return (
    <div className="relative border-b border-green-900/50 bg-green-950/40 backdrop-blur-sm">
      {/* Goal flash banner */}
      {goalFlash && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-yellow-400 text-black font-black text-sm px-5 py-1.5 rounded-full shadow-lg shadow-yellow-900/40 animate-bounce">
            ⚽ GOL! {goalFlash.scorer}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-4">
        {/* Label */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-black uppercase tracking-widest">
            Ao vivo
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-green-900 shrink-0" />

        {/* Scrollable match list */}
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide flex-1">
          {liveMatches.map((m) => {
            const t1 = m.team1Score ?? 0;
            const t2 = m.team2Score ?? 0;
            const isFlashing = goalFlash?.matchId === m.id;
            const f1 = FLAGS[m.team1] ?? '';
            const f2 = FLAGS[m.team2] ?? '';
            const n1 = TEAM_PT[m.team1] ?? m.team1;
            const n2 = TEAM_PT[m.team2] ?? m.team2;
            const statusLabel = STATUS_LABEL[m.status] ?? m.status;

            return (
              <div
                key={m.id}
                className={`flex items-center gap-1.5 shrink-0 px-3 py-1 rounded-lg text-xs transition-all ${
                  isFlashing
                    ? 'bg-yellow-400/20 ring-1 ring-yellow-400/60'
                    : 'bg-slate-900/70'
                }`}
              >
                {f1 && <span className="text-sm">{f1}</span>}
                <span className="font-medium text-slate-200">{n1}</span>
                <span className={`font-black px-2 py-0.5 rounded-md ${
                  isFlashing ? 'text-yellow-300' : 'text-green-400'
                }`}>
                  {t1}–{t2}
                </span>
                <span className="font-medium text-slate-200">{n2}</span>
                {f2 && <span className="text-sm">{f2}</span>}
                <span className="text-slate-600 text-[10px] font-semibold ml-1">{statusLabel}</span>
              </div>
            );
          })}
        </div>

        {/* Last refresh */}
        {refreshedAt && (
          <span className="text-[10px] text-slate-700 shrink-0 hidden sm:block">
            {refreshedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}
