'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { FootballMatch } from '../types';
import { PressureCard, computePressure, type PressureData } from './PressureCard';
import { MatchCalendar } from './MatchCalendar';

const LIVE_STATUSES  = new Set(['1H', 'HT', '2H', 'ET', 'PEN']);
const REFRESH_MS     = 30_000;

// ── FIFA approximate strength (lower = stronger) ─────────────────────────────
// Covers both English API names and Portuguese display names
const FIFA_RANK: Record<string, number> = {
  'Argentina': 1,
  'France': 2,   'França': 2,
  'Spain': 3,    'Espanha': 3,
  'England': 4,  'Inglaterra': 4,
  'Brazil': 5,   'Brasil': 5,
  'Portugal': 6,
  'Netherlands': 7, 'Holanda': 7,
  'Belgium': 8,  'Bélgica': 8,
  'Italy': 9,    'Itália': 9,
  'Germany': 10, 'Alemanha': 10,
  'Colombia': 11, 'Colômbia': 11,
  'Uruguay': 12,  'Uruguai': 12,
  'United States': 13, 'EUA': 13,
  'Mexico': 14,  'México': 14,
  'Japan': 15,   'Japão': 15,
  'Morocco': 16, 'Marrocos': 16,
  'Croatia': 17, 'Croácia': 17,
  'Senegal': 18,
  'Denmark': 19, 'Dinamarca': 19,
  'Switzerland': 20, 'Suíça': 20,
  'Austria': 21, 'Áustria': 21,
  'South Korea': 22, 'Coreia do Sul': 22,
  'Hungary': 23, 'Hungria': 23,
  'Turkey': 24,  'Türkiye': 24, 'Turquia': 24,
  'Poland': 25,  'Polônia': 25,
  'Ukraine': 26, 'Ucrânia': 26,
  'Ecuador': 27, 'Equador': 27,
  'Australia': 28, 'Austrália': 28,
  'Serbia': 29,  'Sérvia': 29,
  'Iran': 30,    'Irã': 30,
  'Canada': 31,  'Canadá': 31,
  'Chile': 32,
  'Qatar': 33,   'Catar': 33,
  'Nigeria': 34, 'Nigéria': 34,
  'Cameroon': 35, 'Camarões': 35,
  'Ghana': 36,   'Gana': 36,
  'Tunisia': 37, 'Tunísia': 37,
  'Egypt': 38,   'Egito': 38,
  "Côte d'Ivoire": 39, 'Ivory Coast': 39, 'Costa do Marfim': 39,
  'South Africa': 40, 'África do Sul': 40,
  'Algeria': 41, 'Argélia': 41,
  'Saudi Arabia': 42, 'Arábia Saudita': 42,
  'Iraq': 43,    'Iraque': 43,
  'Indonesia': 44, 'Indonésia': 44,
  'Scotland': 45, 'Escócia': 45,
  'Slovakia': 46, 'Eslováquia': 46,
  'Slovenia': 47, 'Eslovênia': 47,
  'Norway': 48,  'Noruega': 48,
  'Costa Rica': 49, 'Venezuela': 50,
  'Paraguay': 51, 'Paraguai': 51,
  'Peru': 52,
  'Bolivia': 53, 'Bolívia': 53,
  'Panama': 54,  'Panamá': 54,
  'Honduras': 55, 'Guatemala': 56, 'Jamaica': 57,
  'Wales': 58, 'País de Gales': 58,
  'Greece': 59, 'Grécia': 59,
  'Romania': 60, 'Romênia': 60,
};

type UpsetLevel = 'mild' | 'major' | 'massive';

interface UpsetInfo {
  match: FootballMatch;
  underdog: string;
  favorite: string;
  rankDiff: number;
  level: UpsetLevel;
  score: string;
}

const TEAM_PT_MAP: Record<string, string> = {
  'Brazil': 'Brasil', 'France': 'França', 'Spain': 'Espanha', 'England': 'Inglaterra',
  'Portugal': 'Portugal', 'Netherlands': 'Holanda', 'Belgium': 'Bélgica',
  'Italy': 'Itália', 'Germany': 'Alemanha', 'Colombia': 'Colômbia',
  'Uruguay': 'Uruguai', 'United States': 'EUA', 'Mexico': 'México',
  'Japan': 'Japão', 'Morocco': 'Marrocos', 'Croatia': 'Croácia',
  'Denmark': 'Dinamarca', 'Switzerland': 'Suíça', 'Austria': 'Áustria',
  'South Korea': 'Coreia do Sul', 'Hungary': 'Hungria', 'Turkey': 'Turquia',
  'Türkiye': 'Turquia', 'Poland': 'Polônia', 'Ukraine': 'Ucrânia',
  'Ecuador': 'Equador', 'Australia': 'Austrália', 'Serbia': 'Sérvia',
  'Iran': 'Irã', 'Canada': 'Canadá', 'Qatar': 'Catar', 'Nigeria': 'Nigéria',
  'Cameroon': 'Camarões', 'Ghana': 'Gana', 'Tunisia': 'Tunísia', 'Egypt': 'Egito',
  "Côte d'Ivoire": 'Costa do Marfim', 'Ivory Coast': 'Costa do Marfim',
  'South Africa': 'África do Sul', 'Algeria': 'Argélia', 'Saudi Arabia': 'Arábia Saudita',
  'Iraq': 'Iraque', 'Indonesia': 'Indonésia', 'Scotland': 'Escócia',
  'Slovakia': 'Eslováquia', 'Slovenia': 'Eslovênia', 'Norway': 'Noruega',
  'Paraguay': 'Paraguai', 'Bolivia': 'Bolívia', 'Panama': 'Panamá',
  'Wales': 'País de Gales', 'Greece': 'Grécia', 'Romania': 'Romênia',
};

function tn(name: string): string { return TEAM_PT_MAP[name] ?? name; }

function detectUpsets(matches: FootballMatch[]): UpsetInfo[] {
  const upsets: UpsetInfo[] = [];

  for (const m of matches) {
    const r1 = FIFA_RANK[m.team1] ?? 60;
    const r2 = FIFA_RANK[m.team2] ?? 60;
    const rankDiff = Math.abs(r1 - r2);

    if (rankDiff < 12) continue; // not enough difference to matter

    const s1 = m.team1Score ?? 0;
    const s2 = m.team2Score ?? 0;

    const team1IsFavorite = r1 < r2;
    const underdogWinning =
      (team1IsFavorite  && s2 > s1) ||  // team2 (underdog) winning
      (!team1IsFavorite && s1 > s2);    // team1 (underdog) winning
    const underdogTied = s1 === s2 && rankDiff >= 20 && m.status !== 'NS';

    if (!underdogWinning && !underdogTied) continue;

    const underdog = team1IsFavorite ? tn(m.team2) : tn(m.team1);
    const favorite = team1IsFavorite ? tn(m.team1) : tn(m.team2);
    const level: UpsetLevel = rankDiff >= 30 ? 'massive' : rankDiff >= 20 ? 'major' : 'mild';
    const score = `${s1}–${s2}`;

    upsets.push({ match: m, underdog, favorite, rankDiff, level, score });
  }

  return upsets.sort((a, b) => b.rankDiff - a.rankDiff);
}

const UPSET_STYLE: Record<UpsetLevel, { bg: string; border: string; icon: string; label: string; text: string }> = {
  mild:    { bg: 'bg-amber-950/30',  border: 'border-amber-800/50', icon: '⚠️', label: 'Zebra!',       text: 'text-amber-400' },
  major:   { bg: 'bg-orange-950/40', border: 'border-orange-700/60',icon: '🦓', label: 'Grande Zebra!', text: 'text-orange-400' },
  massive: { bg: 'bg-red-950/40',    border: 'border-red-600/70',   icon: '💥', label: 'ZEBRA ÉPICA!',  text: 'text-red-400' },
};

export function AlertsTab() {
  const [pressureList, setPressureList] = useState<PressureData[]>([]);
  const [upsets, setUpsets]             = useState<UpsetInfo[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshedAt, setRefreshedAt]   = useState<Date | null>(null);

  async function load() {
    try {
      const all: FootballMatch[] = await api.getTodayMatches();
      const live = all.filter((m) => LIVE_STATUSES.has(m.status));

      const computed = live
        .map(computePressure)
        .sort((a, b) => b.probability - a.probability);

      setPressureList(computed);
      setUpsets(detectUpsets(live));
      setRefreshedAt(new Date());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        {[1, 2].map((i) => <div key={i} className="h-52 rounded-2xl bg-slate-800/60" />)}
      </div>
    );
  }

  const noLiveGames = pressureList.length === 0;
  const critical    = pressureList.filter((d) => d.level === 'critical');
  const others      = pressureList.filter((d) => d.level !== 'critical');

  return (
    <div className="space-y-8">

      {/* ── UPSET ALERTS ──────────────────────────────────────────────────── */}
      {upsets.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest">
              Zebra ao vivo
            </h2>
          </div>

          <div className="space-y-3">
            {upsets.map((u) => {
              const cfg = UPSET_STYLE[u.level];
              return (
                <div key={u.match.id} className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{cfg.icon}</span>
                        <span className={`text-xs font-black uppercase tracking-wide ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white leading-snug">
                        <span className={cfg.text}>{u.underdog}</span>
                        {' '}surpreende{' '}
                        <span className="text-slate-300">{u.favorite}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{u.match.championship}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-2xl font-black ${cfg.text}`}>{u.score}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Dif. ranking: {u.rankDiff} pos.
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── PRESSURE ALERTS ───────────────────────────────────────────────── */}
      <section>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-black text-white text-base">Alertas de pressão</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Probabilidade de gol nos próximos 5 min · atualiza a cada 30s
            </p>
          </div>
          {refreshedAt && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {refreshedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="mb-5 p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
          <span className="text-xl shrink-0">💡</span>
          <p className="text-xs text-slate-400 leading-relaxed">
            Probabilidade calculada com <strong className="text-slate-300">xG estimado</strong>,{' '}
            <strong className="text-slate-300">minuto da partida</strong> e{' '}
            <strong className="text-slate-300">situação do placar</strong>.{' '}
            Modelo de Poisson estima os <strong className="text-slate-300">placares mais prováveis</strong> com base no ritmo de gols restante.
          </p>
        </div>

        {noLiveGames ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-4">📡</span>
            <p className="text-slate-400 font-semibold">Nenhum jogo ao vivo agora</p>
            <p className="text-slate-600 text-sm mt-1">
              Os alertas aparecem aqui quando há partidas em andamento
            </p>
          </div>
        ) : (
          <>
            {critical.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  Alertas críticos
                </p>
                <div className="space-y-3">
                  {critical.map((d) => <PressureCard key={d.match.id} data={d} />)}
                </div>
              </div>
            )}
            {others.length > 0 && (
              <div>
                {critical.length > 0 && (
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 mt-6">
                    Outros jogos ao vivo
                  </p>
                )}
                <div className="space-y-3">
                  {others.map((d) => <PressureCard key={d.match.id} data={d} />)}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="mt-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Legenda</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { dot: 'bg-slate-500',  label: 'Baixa',   range: '< 28%' },
                  { dot: 'bg-yellow-500', label: 'Média',   range: '28–44%' },
                  { dot: 'bg-orange-500', label: 'Alta',    range: '45–64%' },
                  { dot: 'bg-red-500',    label: 'Crítica', range: '≥ 65%' },
                ].map(({ dot, label, range }) => (
                  <div key={label} className="flex items-center gap-2 text-slate-400">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                    <span>{label} <span className="text-slate-600">{range}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── CALENDAR HEATMAP ──────────────────────────────────────────────── */}
      <section>
        <h2 className="font-black text-white text-base mb-4">Mapa de jogos</h2>
        <MatchCalendar />
      </section>

    </div>
  );
}
