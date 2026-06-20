'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { FootballMatch } from '../types';
import { PressureCard, computePressure, type PressureData } from './PressureCard';
import { MatchCalendar } from './MatchCalendar';

const LIVE_STATUSES  = new Set(['1H', 'HT', '2H', 'ET', 'PEN']);
const NS_STATUSES    = new Set(['NS']);
const REFRESH_MS     = 30_000;

// ── FIFA ranking aproximado ───────────────────────────────────────────────────
const FIFA_RANK: Record<string, number> = {
  'Argentina': 1, 'France': 2, 'França': 2, 'Spain': 3, 'Espanha': 3,
  'England': 4, 'Inglaterra': 4, 'Brazil': 5, 'Brasil': 5, 'Portugal': 6,
  'Netherlands': 7, 'Holanda': 7, 'Belgium': 8, 'Bélgica': 8,
  'Italy': 9, 'Itália': 9, 'Germany': 10, 'Alemanha': 10,
  'Colombia': 11, 'Colômbia': 11, 'Uruguay': 12, 'Uruguai': 12,
  'United States': 13, 'EUA': 13, 'Mexico': 14, 'México': 14,
  'Japan': 15, 'Japão': 15, 'Morocco': 16, 'Marrocos': 16,
  'Croatia': 17, 'Croácia': 17, 'Senegal': 18, 'Denmark': 19, 'Dinamarca': 19,
  'Switzerland': 20, 'Suíça': 20, 'Austria': 21, 'Áustria': 21,
  'South Korea': 22, 'Coreia do Sul': 22, 'Hungary': 23, 'Hungria': 23,
  'Turkey': 24, 'Türkiye': 24, 'Turquia': 24, 'Poland': 25, 'Polônia': 25,
  'Ukraine': 26, 'Ucrânia': 26, 'Ecuador': 27, 'Equador': 27,
  'Australia': 28, 'Austrália': 28, 'Serbia': 29, 'Sérvia': 29,
  'Iran': 30, 'Irã': 30, 'Canada': 31, 'Canadá': 31, 'Chile': 32,
  'Qatar': 33, 'Catar': 33, 'Nigeria': 34, 'Nigéria': 34,
  'Cameroon': 35, 'Camarões': 35, 'Ghana': 36, 'Gana': 36,
  'Tunisia': 37, 'Tunísia': 37, 'Egypt': 38, 'Egito': 38,
  "Côte d'Ivoire": 39, 'Ivory Coast': 39, 'Costa do Marfim': 39,
  'Saudi Arabia': 42, 'Arábia Saudita': 42, 'Iraq': 43, 'Iraque': 43,
  'Indonesia': 44, 'Indonésia': 44, 'Panama': 54, 'Panamá': 54,
  'Venezuela': 50, 'Paraguay': 51, 'Paraguai': 51, 'Peru': 52,
  'Bolivia': 53, 'Bolívia': 53,
  'Czech Republic': 35, 'Tchéquia': 35,
  'Georgia': 75, 'Geórgia': 75,
};

// ── Estilo tático e compatibilidade ──────────────────────────────────────────
const STYLE_CLASH: Record<string, Record<string, { goals: 'high' | 'medium' | 'low'; label: string }>> = {
  pressing:   { counter:    { goals: 'high',   label: 'Pressão vs Contra — jogo aberto' },
                possession: { goals: 'medium',  label: 'Pressão vs Posse — disputa física' },
                defensive:  { goals: 'medium',  label: 'Pressão vs Defensivo — time na parede' },
                pressing:   { goals: 'high',    label: 'Pressão vs Pressão — batalha intensa' } },
  counter:    { pressing:   { goals: 'high',   label: 'Contra vs Pressão — espaços abertos' },
                possession: { goals: 'high',    label: 'Contra vs Posse — espaços nas costas' },
                defensive:  { goals: 'low',     label: 'Contra vs Defensivo — jogo travado' },
                counter:    { goals: 'medium',  label: 'Contra vs Contra — espera e explosão' } },
  possession: { pressing:   { goals: 'medium', label: 'Posse vs Pressão — briga pelo controle' },
                counter:    { goals: 'high',    label: 'Posse vs Contra — espaços em aberto' },
                defensive:  { goals: 'medium',  label: 'Posse vs Defensivo — paciência' },
                possession: { goals: 'low',     label: 'Posse vs Posse — quem erra paga' } },
  defensive:  { pressing:   { goals: 'medium', label: 'Defensivo vs Pressão — bloco baixo' },
                counter:    { goals: 'low',     label: 'Defensivo vs Contra — jogo fechado' },
                possession: { goals: 'medium',  label: 'Defensivo vs Posse — aguarda erro' },
                defensive:  { goals: 'low',     label: 'Defensivo vs Defensivo — 0x0 provável' } },
};

const GOALS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  high:   { bg: 'bg-orange-950/50', text: 'text-orange-400', label: '🔥 Jogo aberto' },
  medium: { bg: 'bg-yellow-950/50', text: 'text-yellow-400', label: '⚡ Equilibrado' },
  low:    { bg: 'bg-slate-800',     text: 'text-slate-400',  label: '🛡️ Jogo fechado' },
};

type UpsetLevel = 'mild' | 'major' | 'massive';

interface UpsetInfo {
  match: FootballMatch;
  underdog: string;
  favorite: string;
  rankDiff: number;
  level: UpsetLevel;
}

const UPSET_STYLE: Record<UpsetLevel, { bg: string; border: string; icon: string; label: string; text: string }> = {
  mild:    { bg: 'bg-amber-950/30',  border: 'border-amber-800/50',  icon: '⚠️', label: 'Zebra!',       text: 'text-amber-400'  },
  major:   { bg: 'bg-orange-950/40', border: 'border-orange-700/60', icon: '🦓', label: 'Grande Zebra!', text: 'text-orange-400' },
  massive: { bg: 'bg-red-950/40',    border: 'border-red-600/70',    icon: '💥', label: 'ZEBRA ÉPICA!',  text: 'text-red-400'    },
};

function detectUpsets(matches: FootballMatch[]): UpsetInfo[] {
  return matches
    .filter(m => LIVE_STATUSES.has(m.status))
    .flatMap(m => {
      const r1 = FIFA_RANK[m.team1] ?? 70;
      const r2 = FIFA_RANK[m.team2] ?? 70;
      const rankDiff = Math.abs(r1 - r2);
      if (rankDiff < 12) return [];
      const s1 = m.team1Score ?? 0;
      const s2 = m.team2Score ?? 0;
      const team1IsFav = r1 < r2;
      const underdogWinning = (team1IsFav && s2 > s1) || (!team1IsFav && s1 > s2);
      const underdogTied    = s1 === s2 && rankDiff >= 20;
      if (!underdogWinning && !underdogTied) return [];
      const level: UpsetLevel = rankDiff >= 30 ? 'massive' : rankDiff >= 20 ? 'major' : 'mild';
      return [{ match: m, underdog: team1IsFav ? m.team2 : m.team1, favorite: team1IsFav ? m.team1 : m.team2, rankDiff, level }];
    })
    .sort((a, b) => b.rankDiff - a.rankDiff);
}

interface TacticalMatchup {
  match: FootballMatch;
  homeStyle: string;
  awayStyle: string;
  goals: 'high' | 'medium' | 'low';
  label: string;
  homeFormation: string;
  awayFormation: string;
}

function detectTacticalMatchups(matches: FootballMatch[]): TacticalMatchup[] {
  return matches
    .filter(m => m.tactics?.home && m.tactics?.away)
    .map(m => {
      const hs = m.tactics!.home.dominanceStyle ?? 'pressing';
      const as_ = m.tactics!.away.dominanceStyle ?? 'counter';
      const clash = STYLE_CLASH[hs]?.[as_] ?? { goals: 'medium', label: 'Duelo tático' };
      return {
        match: m,
        homeStyle: hs,
        awayStyle: as_,
        goals: clash.goals,
        label: clash.label,
        homeFormation: m.tactics!.home.formation ?? '—',
        awayFormation: m.tactics!.away.formation ?? '—',
      };
    })
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.goals] - order[b.goals];
    });
}

interface TensionAlert {
  match: FootballMatch;
  type: 'comeback' | 'late_draw' | 'decisive';
  label: string;
  icon: string;
  desc: string;
}

function detectTensionAlerts(matches: FootballMatch[]): TensionAlert[] {
  const alerts: TensionAlert[] = [];
  for (const m of matches) {
    if (!LIVE_STATUSES.has(m.status)) continue;
    const s1 = m.team1Score ?? 0;
    const s2 = m.team2Score ?? 0;
    const diff = Math.abs(s1 - s2);
    const isLate = m.status === '2H' || m.status === 'ET';

    if (diff === 1 && isLate) {
      const losing = s1 < s2 ? m.team1 : m.team2;
      alerts.push({ match: m, type: 'comeback', icon: '⚡', label: 'Virada possível', desc: `${losing} precisa de 1 gol — pressão máxima` });
    }
    if (diff === 0 && isLate) {
      alerts.push({ match: m, type: 'late_draw', icon: '🔥', label: 'Empate tenso', desc: 'Ambos pressionando — gol pode sair a qualquer momento' });
    }
    if (m.status === 'ET') {
      alerts.push({ match: m, type: 'decisive', icon: '💥', label: 'Prorrogação!', desc: 'Qualquer erro é eliminação' });
    }
  }
  return alerts;
}

interface FavoriteAlert {
  match: FootballMatch;
  homeRank: number;
  awayRank: number;
  favorite: string;
  underdog: string;
  rankDiff: number;
}

function detectFavoriteMatchups(matches: FootballMatch[]): FavoriteAlert[] {
  return matches
    .filter(m => NS_STATUSES.has(m.status))
    .flatMap(m => {
      const r1 = FIFA_RANK[m.team1] ?? 70;
      const r2 = FIFA_RANK[m.team2] ?? 70;
      const rankDiff = Math.abs(r1 - r2);
      if (rankDiff < 10) return [];
      return [{
        match: m,
        homeRank: r1, awayRank: r2,
        favorite: r1 < r2 ? m.team1 : m.team2,
        underdog: r1 < r2 ? m.team2 : m.team1,
        rankDiff,
      }];
    })
    .sort((a, b) => b.rankDiff - a.rankDiff)
    .slice(0, 4);
}

const STYLE_ICON: Record<string, string> = {
  pressing: '🔥', counter: '⚡', possession: '🔵', defensive: '🛡️',
};
const STYLE_LABEL: Record<string, string> = {
  pressing: 'Pressão', counter: 'Contra-ataque', possession: 'Posse', defensive: 'Defensivo',
};

export function PrevisaoTab() {
  const [matches, setMatches]       = useState<FootballMatch[]>([]);
  const [pressureList, setPressureList] = useState<PressureData[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  async function load() {
    try {
      const all: FootballMatch[] = await api.getTodayMatches();
      setMatches(all);
      const live = all.filter(m => LIVE_STATUSES.has(m.status));
      const computed = live.map(computePressure).sort((a, b) => b.probability - a.probability);
      setPressureList(computed);
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
        {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-2xl bg-slate-800/60" />)}
      </div>
    );
  }

  const upsets       = detectUpsets(matches);
  const tactical     = detectTacticalMatchups(matches);
  const tension      = detectTensionAlerts(matches);
  const favorites    = detectFavoriteMatchups(matches);
  const critical     = pressureList.filter(d => d.level === 'critical');
  const others       = pressureList.filter(d => d.level !== 'critical');
  const liveCount    = pressureList.length;

  return (
    <div className="space-y-10">

      {/* ── TENSÃO AO VIVO ─────────────────────────────────────────────────── */}
      {tension.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <h2 className="text-xs font-bold text-red-400 uppercase tracking-widest">Tensão ao vivo</h2>
          </div>
          <div className="space-y-3">
            {tension.map((a, i) => (
              <div key={i} className="bg-red-950/20 border border-red-800/40 rounded-2xl p-4 flex items-center gap-4">
                <span className="text-3xl">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-red-400 uppercase tracking-wide mb-0.5">{a.label}</p>
                  <p className="text-sm font-bold text-white">{a.match.team1} vs {a.match.team2}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{a.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-black text-white">{a.match.team1Score ?? 0}–{a.match.team2Score ?? 0}</p>
                  <p className="text-[10px] text-slate-500">{a.match.championship}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── ZEBRA AO VIVO ──────────────────────────────────────────────────── */}
      {upsets.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest">Zebra ao vivo</h2>
          </div>
          <div className="space-y-3">
            {upsets.map((u, i) => {
              const cfg = UPSET_STYLE[u.level];
              return (
                <div key={i} className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{cfg.icon}</span>
                        <span className={`text-xs font-black uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
                      </div>
                      <p className="text-sm font-bold text-white leading-snug">
                        <span className={cfg.text}>{u.underdog}</span>{' '}surpreende{' '}
                        <span className="text-slate-300">{u.favorite}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{u.match.championship} · Dif. ranking: {u.rankDiff} posições</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-2xl font-black ${cfg.text}`}>
                        {u.match.team1Score ?? 0}–{u.match.team2Score ?? 0}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── PRESSÃO DE GOL ─────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-black text-white text-base">Pressão de gol</h2>
          {refreshedAt && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {refreshedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-4">Probabilidade de gol nos próximos 5 min · xG + minuto + placar</p>

        {liveCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-4">📡</span>
            <p className="text-slate-400 font-semibold">Nenhum jogo ao vivo agora</p>
            <p className="text-slate-600 text-sm mt-1">Os alertas aparecem aqui quando há partidas em andamento</p>
          </div>
        ) : (
          <>
            {critical.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />Alertas críticos
                </p>
                <div className="space-y-3">{critical.map(d => <PressureCard key={d.match.id} data={d} />)}</div>
              </div>
            )}
            {others.length > 0 && (
              <div>
                {critical.length > 0 && (
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 mt-6">Outros ao vivo</p>
                )}
                <div className="space-y-3">{others.map(d => <PressureCard key={d.match.id} data={d} />)}</div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── ANÁLISE TÁTICA ─────────────────────────────────────────────────── */}
      {tactical.length > 0 && (
        <section>
          <h2 className="font-black text-white text-base mb-1">Duelos táticos</h2>
          <p className="text-xs text-slate-500 mb-4">Como os estilos de jogo se confrontam hoje</p>
          <div className="space-y-3">
            {tactical.map((t, i) => {
              const badge = GOALS_BADGE[t.goals];
              return (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 mb-1">{t.match.championship}</p>
                      <p className="text-sm font-bold text-white">{t.match.team1} vs {t.match.team2}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2">
                      <span className="text-lg">{STYLE_ICON[t.homeStyle] ?? '⚽'}</span>
                      <div>
                        <p className="text-xs font-bold text-white">{t.match.team1}</p>
                        <p className="text-[10px] text-slate-500">{STYLE_LABEL[t.homeStyle]} · {t.homeFormation}</p>
                      </div>
                    </div>
                    <span className="text-slate-600 font-black text-xs">VS</span>
                    <div className="flex-1 flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2">
                      <span className="text-lg">{STYLE_ICON[t.awayStyle] ?? '⚽'}</span>
                      <div>
                        <p className="text-xs font-bold text-white">{t.match.team2}</p>
                        <p className="text-[10px] text-slate-500">{STYLE_LABEL[t.awayStyle]} · {t.awayFormation}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 px-1">{t.label}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── FAVORITOS DO DIA ───────────────────────────────────────────────── */}
      {favorites.length > 0 && (
        <section>
          <h2 className="font-black text-white text-base mb-1">Favoritos do dia</h2>
          <p className="text-xs text-slate-500 mb-4">Diferença de nível entre os times pelo ranking FIFA</p>
          <div className="space-y-3">
            {favorites.map((f, i) => {
              const favRank  = f.homeRank < f.awayRank ? f.homeRank : f.awayRank;
              const undRank  = f.homeRank < f.awayRank ? f.awayRank : f.homeRank;
              const time = new Date(f.match.date).toLocaleTimeString('pt-BR', {
                hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
              });
              return (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-slate-500">{f.match.championship} · {time}</p>
                    <span className="text-xs font-bold text-yellow-400 bg-yellow-950/50 px-2.5 py-1 rounded-full">
                      #{favRank} vs #{undRank}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-yellow-950/20 border border-yellow-800/30 rounded-xl px-3 py-2.5 text-center">
                      <p className="text-xs font-black text-yellow-400 mb-0.5">Favorito</p>
                      <p className="text-sm font-bold text-white">{f.favorite}</p>
                    </div>
                    <div className="text-center shrink-0">
                      <p className="text-xs text-slate-600 font-bold">vs</p>
                      <p className="text-[10px] text-slate-700">{f.rankDiff}pos</p>
                    </div>
                    <div className="flex-1 bg-slate-800 rounded-xl px-3 py-2.5 text-center">
                      <p className="text-xs font-bold text-slate-500 mb-0.5">Azarão</p>
                      <p className="text-sm font-bold text-white">{f.underdog}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── CALENDÁRIO ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-black text-white text-base mb-4">Calendário da Copa</h2>
        <MatchCalendar />
      </section>

    </div>
  );
}
