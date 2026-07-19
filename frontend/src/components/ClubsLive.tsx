'use client';

import { useEffect, useState } from 'react';
import { api, type ClubMatch, type LiveDynamics } from '../lib/api';

const LIVE = new Set(['1H', 'HT', '2H', 'ET', 'PEN', 'LIVE']);

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    '1H': '1º tempo', 'HT': 'Intervalo', '2H': '2º tempo', 'ET': 'Prorrogação',
    'PEN': 'Pênaltis', 'LIVE': 'Ao vivo', 'FT': 'Encerrado', 'NS': 'A começar',
    'PST': 'Adiado',
  };
  return map[s] ?? s;
}

function TeamRow({ name, flag, score, show, win }: {
  name: string; flag?: string; score?: number; show: boolean; win: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 ${win ? 'bg-yellow-950/30' : ''}`}>
      <div className="flex items-center gap-2 min-w-0">
        {flag ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={flag} alt="" className="w-5 h-5 object-contain shrink-0" />
        ) : (
          <span className="w-5 h-5 grid place-items-center text-xs">⚽</span>
        )}
        <span className={`text-sm font-semibold truncate ${win ? 'text-yellow-400' : 'text-white'}`}>{name}</span>
      </div>
      <span className={`text-sm font-black tabular-nums ml-2 shrink-0 ${
        win ? 'text-yellow-400' : show ? 'text-white' : 'text-slate-600'
      }`}>{show && score !== undefined ? score : '—'}</span>
    </div>
  );
}

function ProbBar({ home, draw, away, homeName, awayName }: {
  home: number; draw: number; away: number; homeName: string; awayName: string;
}) {
  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-800">
        <div className="bg-emerald-500" style={{ width: `${home}%` }} />
        <div className="bg-slate-500" style={{ width: `${draw}%` }} />
        <div className="bg-sky-500" style={{ width: `${away}%` }} />
      </div>
      <div className="flex justify-between mt-1 text-[10px] font-bold">
        <span className="text-emerald-400">{homeName.split(' ')[0]} {home}%</span>
        <span className="text-slate-400">Empate {draw}%</span>
        <span className="text-sky-400">{awayName.split(' ')[0]} {away}%</span>
      </div>
    </div>
  );
}

function Dynamics({ match }: { match: ClubMatch }) {
  const [data, setData] = useState<LiveDynamics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const d = await api.getClubDynamics(match.id);
        if (alive) { setData(d); setError(false); }
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    // Jogo ao vivo: revalida a cada 60s (o backend cacheia por placar/status).
    const isLive = LIVE.has(match.status);
    const t = isLive ? setInterval(load, 60000) : undefined;
    return () => { alive = false; if (t) clearInterval(t); };
  }, [match.id, match.status]);

  if (loading) {
    return <div className="px-3 py-4 text-center text-xs text-slate-500 animate-pulse">Gerando dinâmica tática…</div>;
  }
  if (error || !data) {
    return <div className="px-3 py-4 text-center text-xs text-slate-500">Não foi possível gerar a análise agora.</div>;
  }

  const providerBadge = data.provider === 'groq'
    ? { label: 'Llama 3.3 70B', cls: 'bg-orange-950/50 text-orange-300 border-orange-800/50' }
    : { label: 'Heurística', cls: 'bg-slate-800 text-slate-400 border-slate-700' };

  const momentumText = data.momentum === 'home' ? match.team1 : data.momentum === 'away' ? match.team2 : 'Equilibrado';

  return (
    <div className="px-3 py-3 space-y-3 border-t border-slate-800 bg-slate-950/60">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Dinâmica tática {data.phase === 'live' ? '· ao vivo' : data.phase === 'post' ? '· pós-jogo' : '· prévia'}
        </span>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${providerBadge.cls}`}>{providerBadge.label}</span>
      </div>

      <ProbBar home={data.winProbHome} draw={data.drawProb} away={data.winProbAway} homeName={match.team1} awayName={match.team2} />

      <p className="text-sm text-slate-200 leading-snug">{data.tacticalRead}</p>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-2">
          <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">Momento</div>
          <div className="font-bold text-white truncate">{momentumText}</div>
        </div>
        <div className="rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-2">
          <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">Próximo gol</div>
          <div className="font-bold text-white">
            <span className="text-emerald-400">{data.nextGoal.home}%</span>
            <span className="text-slate-600"> · </span>
            <span className="text-sky-400">{data.nextGoal.away}%</span>
          </div>
        </div>
      </div>

      <div>
        <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1.5">O que pode vir a ocorrer</div>
        <ul className="space-y-1">
          {data.whatMayHappen.map((s, i) => (
            <li key={i} className="text-xs text-slate-300 flex gap-1.5">
              <span className="text-yellow-500">›</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg bg-yellow-950/20 border border-yellow-900/40 px-2.5 py-2">
        <span className="text-[9px] uppercase tracking-widest text-yellow-600 font-bold">Ponto decisivo · </span>
        <span className="text-xs text-yellow-200/90">{data.keyRisk}</span>
      </div>
    </div>
  );
}

function ClubCard({ match }: { match: ClubMatch }) {
  const [open, setOpen] = useState(false);
  const isLive = LIVE.has(match.status);
  const isDone = match.status === 'FT';
  const showScore = isLive || isDone;
  const homeWin = isDone && (match.team1Score ?? 0) > (match.team2Score ?? 0);
  const awayWin = isDone && (match.team2Score ?? 0) > (match.team1Score ?? 0);
  const time = new Date(match.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`rounded-xl overflow-hidden border transition-all ${
      isLive ? 'border-yellow-500/70 shadow-lg shadow-yellow-900/20' : 'border-slate-800'
    }`}>
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
          <span>{match.leagueEmoji}</span>{match.league}
        </span>
        {isLive ? (
          <span className="flex items-center gap-1 text-[9px] font-black text-yellow-400 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />{statusLabel(match.status)}
          </span>
        ) : (
          <span className="text-[10px] text-slate-500">{isDone ? statusLabel(match.status) : time}</span>
        )}
      </div>
      <div className="bg-slate-900 divide-y divide-slate-800/60">
        <TeamRow name={match.team1} flag={match.team1Flag} score={match.team1Score} show={showScore} win={homeWin} />
        <TeamRow name={match.team2} flag={match.team2Flag} score={match.team2Score} show={showScore} win={awayWin} />
      </div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-yellow-400 bg-slate-900/60 hover:bg-slate-900 transition flex items-center justify-center gap-1"
      >
        {open ? 'Ocultar análise' : '🤖 Dinâmica tática ao vivo'}
      </button>
      {open && <Dynamics match={match} />}
    </div>
  );
}

export function ClubsLive() {
  const [matches, setMatches] = useState<ClubMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('todos');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getClubMatches();
        setMatches(data);
      } catch {
        // silencioso — mantém o estado anterior
      } finally {
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const leagues = Array.from(
    new Map(matches.map(m => [m.leagueCode, { code: m.leagueCode, name: m.league, emoji: m.leagueEmoji }])).values(),
  );
  const liveCount = matches.filter(m => LIVE.has(m.status)).length;

  const filtered = matches.filter(m =>
    tab === 'todos' ? true : tab === 'live' ? LIVE.has(m.status) : m.leagueCode === tab,
  );

  const tabs = [
    { key: 'todos', label: 'Todos' },
    ...(liveCount > 0 ? [{ key: 'live', label: `🔴 Ao vivo (${liveCount})` }] : []),
    ...leagues.map(l => ({ key: l.code, label: `${l.emoji} ${l.name}` })),
  ];

  return (
    <section className="px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            ⚽ Clubes ao vivo
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Brasileirão + Top 5 da Europa · placares em tempo real e dinâmica tática por IA
          </p>
        </div>

        <div className="flex gap-1.5 mb-6 overflow-x-auto scrollbar-hide">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                tab === key ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && matches.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-slate-800/40 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <span className="text-5xl">🗓️</span>
            <p className="text-white font-bold text-lg">Nenhum jogo de clube nesta janela</p>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              Assim que houver jogos do Brasileirão ou das ligas europeias, eles aparecem aqui com a análise ao vivo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(m => <ClubCard key={m.id} match={m} />)}
          </div>
        )}
      </div>
    </section>
  );
}
