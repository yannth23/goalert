'use client';

import { useEffect, useState } from 'react';
import { api, type BracketMetadata, type BracketState, type BracketSlot } from '../lib/api';

/**
 * Este componente NÃO calcula nada. Todo o estado do bracket (quem joga com
 * quem, placar, vencedor) vem PRONTO do backend via GET /matches/bracket,
 * que lê de uma tabela persistida (BracketSlot) — não do histórico de jogos
 * recalculado a cada render. Se um confronto aparecer errado, o bug está no
 * backend (bracket.service.ts), não aqui. Não "conserte" isso adicionando
 * lógica de cálculo de volta neste arquivo.
 */

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'PEN']);

const PHASES: { key: keyof BracketState; label: string; emoji: string }[] = [
  { key: 'r32',     label: 'Rd. de 32', emoji: '⚔️' },
  { key: 'r16',     label: 'Oitavas',   emoji: '🎯' },
  { key: 'quartas', label: 'Quartas',   emoji: '🔥' },
  { key: 'semi',    label: 'Semifinal', emoji: '⚡' },
  { key: 'final',   label: 'Final',     emoji: '🏆' },
];

function SlotCard({ slot, flags }: { slot: BracketSlot; flags: Record<string, string> }) {
  const isLive = LIVE_STATUSES.has(slot.status === 'IN_PROGRESS' ? '1H' : '');
  const isDone = slot.status === 'DONE';
  const homeWins = isDone && slot.winner === slot.homeTeam;
  const awayWins = isDone && slot.winner === slot.awayTeam;
  // Nota de desempate: usa a nota oficial do backend (ex: "Pênaltis 3–4") e,
  // se não vier, infere "Pênaltis" quando o jogo DONE terminou empatado com vencedor.
  const decidedOnPens = isDone && slot.homeScore !== null && slot.homeScore === slot.awayScore && !!slot.winner;
  const tiebreak = slot.note || (decidedOnPens ? 'Pênaltis' : null);

  return (
    <div className={`rounded-xl overflow-hidden border transition-all ${
      slot.status === 'IN_PROGRESS' ? 'border-yellow-500/70 shadow-lg shadow-yellow-900/20' :
      isDone ? 'border-slate-700' : 'border-slate-800'
    }`}>
      {slot.status === 'IN_PROGRESS' && (
        <div className="bg-yellow-500 px-2.5 py-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
          <span className="text-[9px] font-black text-black uppercase tracking-widest">Ao Vivo</span>
        </div>
      )}
      <div className="px-2.5 pt-1.5 pb-0 flex items-center justify-between">
        <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
          Jogo {slot.gameNumber}
        </span>
        {tiebreak && (
          <span className="text-[9px] text-yellow-500/80 font-bold uppercase tracking-widest">
            {tiebreak}
          </span>
        )}
      </div>
      <div className="bg-slate-900 divide-y divide-slate-800/60">
        {[
          { name: slot.homeTeam, slotNotation: slot.homeSlot, score: slot.homeScore, wins: homeWins },
          { name: slot.awayTeam, slotNotation: slot.awaySlot, score: slot.awayScore, wins: awayWins },
        ].map((side, i) => {
          const displayName = side.name || side.slotNotation || 'A definir';
          const flag = side.name ? (flags[side.name] || '') : '';
          return (
            <div key={i} className={`flex items-center justify-between px-2.5 py-2 ${side.wins ? 'bg-yellow-950/30' : ''}`}>
              <div className="flex items-center gap-1.5 min-w-0">
                {flag && <span className="text-base leading-none">{flag}</span>}
                <span className={`text-xs font-semibold truncate ${
                  !side.name ? 'text-slate-500 italic' :
                  side.wins ? 'text-yellow-400' : 'text-slate-200'
                }`}>
                  {displayName}
                </span>
              </div>
              <span className={`text-sm font-black tabular-nums ml-2 shrink-0 ${
                side.wins ? 'text-yellow-400' :
                (isLive || isDone) ? 'text-white' : 'text-slate-700'
              }`}>
                {(isLive || isDone) && side.score !== null ? side.score : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhaseGrid({ slots, flags, emptyLabel, gridCols }: {
  slots: BracketSlot[];
  flags: Record<string, string>;
  emptyLabel: string;
  gridCols: string;
}) {
  const hasContent = slots.some(s => s.homeTeam || s.awayTeam);
  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <span className="text-5xl">⏳</span>
        <p className="text-white font-bold text-lg">{emptyLabel}</p>
        <p className="text-slate-500 text-sm max-w-xs">
          Aguardando a fase anterior terminar para definir os confrontos.
        </p>
      </div>
    );
  }
  return (
    <div className={`grid ${gridCols} gap-3`}>
      {slots.map(slot => <SlotCard key={slot.id} slot={slot} flags={flags} />)}
    </div>
  );
}

export function BracketSection() {
  const [metadata, setMetadata] = useState<BracketMetadata | null>(null);
  const [bracket, setBracket]   = useState<BracketState | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [activePhase, setActivePhase] = useState<keyof BracketState>('r32');

  // Metadata (bandeiras) muda raramente — busca uma vez.
  useEffect(() => {
    api.getMetadata().then(setMetadata).catch(() => {});
  }, []);

  // Estado do bracket — persistido no backend, só refletimos aqui. Poll a
  // cada 30s só pega o que já foi resolvido do lado do servidor; não há
  // cálculo nenhum acontecendo neste componente.
  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getBracket();
        setBracket(data);
        setError(false);
      } catch {
        setError(true);
      }
      setLoading(false);
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const liveCount = bracket
    ? Object.values(bracket).flat().filter(s => s.status === 'IN_PROGRESS').length
    : 0;

  const champion = bracket?.final[0]?.status === 'DONE' ? bracket.final[0].winner : null;

  return (
    <section id="bracket" className="px-4 py-12 border-t border-slate-800/50">
      <div className="max-w-6xl mx-auto">

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">
              🏆 Chaveamento — Mata-mata
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Copa do Mundo FIFA 2026 · Estado persistido, atualizado a cada resultado
            </p>
          </div>
          {liveCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-yellow-400 bg-yellow-950/40 border border-yellow-800/50 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              {liveCount} ao vivo
            </span>
          )}
        </div>

        {champion && (
          <div className="mb-6 text-center bg-gradient-to-r from-yellow-600/20 via-yellow-500/30 to-yellow-600/20 border border-yellow-500/40 rounded-xl py-4">
            <p className="text-xs text-yellow-400 font-bold uppercase tracking-widest mb-1">🏆 Campeão da Copa</p>
            <p className="text-2xl font-black text-white">
              {metadata?.flags[champion] || ''} {champion}
            </p>
          </div>
        )}

        <div className="flex gap-1.5 mb-6 overflow-x-auto scrollbar-hide">
          {PHASES.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => setActivePhase(key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                activePhase === key ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{emoji}</span>{label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-800/40 animate-pulse" />
            ))}
          </div>
        ) : error || !bracket ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            Não foi possível carregar o bracket. Tente novamente em instantes.
          </div>
        ) : (
          <>
            {activePhase === 'r32' && (
              <PhaseGrid slots={bracket.r32} flags={metadata?.flags ?? {}} emptyLabel="Rd. de 32" gridCols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" />
            )}
            {activePhase === 'r16' && (
              <PhaseGrid slots={bracket.r16} flags={metadata?.flags ?? {}} emptyLabel="Oitavas de Final" gridCols="grid-cols-2 sm:grid-cols-4" />
            )}
            {activePhase === 'quartas' && (
              <PhaseGrid slots={bracket.quartas} flags={metadata?.flags ?? {}} emptyLabel="Quartas de Final" gridCols="grid-cols-2 sm:grid-cols-4" />
            )}
            {activePhase === 'semi' && (
              <PhaseGrid slots={bracket.semi} flags={metadata?.flags ?? {}} emptyLabel="Semifinais" gridCols="grid-cols-1 sm:grid-cols-2 max-w-xl mx-auto" />
            )}
            {activePhase === 'final' && (
              <PhaseGrid slots={bracket.final} flags={metadata?.flags ?? {}} emptyLabel="Grande Final" gridCols="max-w-sm mx-auto" />
            )}
          </>
        )}

        <div className="mt-4 flex items-center gap-4 text-xs text-slate-600 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-500/80" />
            <span>Vencedor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span>Ao vivo agora</span>
          </div>
        </div>
      </div>
    </section>
  );
}
