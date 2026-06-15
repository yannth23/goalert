import type { FootballMatch } from '../types';

// Status mapeados pelo backend (football-data.org → interno)
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  NS:  { label: 'Não iniciado',  className: 'bg-slate-800 text-slate-400' },
  '1H':{ label: '● 1º Tempo',    className: 'bg-green-950 text-green-400' },
  HT:  { label: 'Intervalo',     className: 'bg-yellow-950 text-yellow-400' },
  '2H':{ label: '● 2º Tempo',    className: 'bg-green-950 text-green-400' },
  ET:  { label: '● Prorrogação', className: 'bg-green-950 text-green-400' },
  PEN: { label: '● Pênaltis',    className: 'bg-orange-950 text-orange-400' },
  FT:  { label: 'Encerrado',     className: 'bg-slate-800 text-slate-500' },
  PST: { label: 'Adiado',        className: 'bg-red-950 text-red-400' },
};

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'PEN']);

interface MatchCardProps {
  match: FootballMatch;
  highlighted?: boolean;
}

export function MatchCard({ match, highlighted }: MatchCardProps) {
  const time = new Date(match.date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const status = STATUS_MAP[match.status] ?? {
    label: match.status,
    className: 'bg-slate-800 text-slate-400',
  };

  const isLive = LIVE_STATUSES.has(match.status);
  const isFinished = match.status === 'FT';
  const hasScore = match.team1Score !== undefined && match.team2Score !== undefined;

  return (
    <div className={`bg-slate-900 border rounded-2xl p-5 transition-all ${
      highlighted
        ? 'border-yellow-600/50 shadow-yellow-900/20 shadow-lg'
        : 'border-slate-800'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-slate-500 font-medium">{match.championship}</span>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="font-bold text-white flex-1 text-right">{match.team1}</span>

        <div className="flex flex-col items-center px-4">
          {(isLive || isFinished) && hasScore ? (
            <span className={`font-black text-2xl ${isLive ? 'text-yellow-500' : 'text-slate-300'}`}>
              {match.team1Score} · {match.team2Score}
            </span>
          ) : (
            <>
              <span className="text-sm text-slate-400 font-semibold">{time}</span>
              <span className="text-xs text-slate-700">vs</span>
            </>
          )}
        </div>

        <span className="font-bold text-white flex-1">{match.team2}</span>
      </div>

      {highlighted && (
        <div className="mt-3 pt-3 border-t border-yellow-900/40 text-xs text-yellow-500 font-semibold">
          ⭐ Time favorito
        </div>
      )}
    </div>
  );
}
