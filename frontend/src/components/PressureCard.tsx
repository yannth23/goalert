import type { FootballMatch } from '../types';

const FLAGS: Record<string, string> = {
  'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'France': '🇫🇷', 'Germany': '🇩🇪',
  'Spain': '🇪🇸', 'Portugal': '🇵🇹', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'United States': '🇺🇸',
  'Mexico': '🇲🇽', 'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Morocco': '🇲🇦',
  'Nigeria': '🇳🇬', 'Senegal': '🇸🇳', 'Croatia': '🇭🇷', 'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪', 'Uruguay': '🇺🇾', 'Italy': '🇮🇹', 'Switzerland': '🇨🇭',
  'Denmark': '🇩🇰', 'Australia': '🇦🇺', 'Canada': '🇨🇦', 'Ecuador': '🇪🇨',
  'Ghana': '🇬🇭', 'Qatar': '🇶🇦', 'Poland': '🇵🇱', 'Tunisia': '🇹🇳',
  'Cameroon': '🇨🇲', 'Costa Rica': '🇨🇷', 'Serbia': '🇷🇸', 'Iran': '🇮🇷',
  'Saudi Arabia': '🇸🇦', 'Colombia': '🇨🇴', 'Chile': '🇨🇱', 'Türkiye': '🇹🇷',
  'Turkey': '🇹🇷', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Norway': '🇳🇴', 'Ukraine': '🇺🇦',
  'Indonesia': '🇮🇩', 'Slovenia': '🇸🇮', 'Iraq': '🇮🇶', 'Egypt': '🇪🇬',
};

const TEAM_PT: Record<string, string> = {
  'Mexico': 'México', 'South Korea': 'Coreia do Sul', 'South Africa': 'África do Sul',
  'Switzerland': 'Suíça', 'Canada': 'Canadá', 'Serbia': 'Sérvia',
  'Bosnia and Herzegovina': 'Bósnia', 'Scotland': 'Escócia', 'Morocco': 'Marrocos',
  'Brazil': 'Brasil', 'United States': 'EUA', 'Australia': 'Austrália',
  'Türkiye': 'Turquia', 'Turkey': 'Turquia', 'Netherlands': 'Holanda',
  'Germany': 'Alemanha', 'Japan': 'Japão', 'Belgium': 'Bélgica',
  'Argentina': 'Argentina', 'Egypt': 'Egito', 'New Zealand': 'Nova Zelândia',
  'Spain': 'Espanha', 'France': 'França', 'Uruguay': 'Uruguai',
  'England': 'Inglaterra', 'Colombia': 'Colômbia', 'Saudi Arabia': 'Arábia Saudita',
  'Iran': 'Irã', 'Nigeria': 'Nigéria', 'Croatia': 'Croácia', 'Denmark': 'Dinamarca',
  'Ecuador': 'Equador', 'Italy': 'Itália', 'Norway': 'Noruega', 'Iraq': 'Iraque',
  'Poland': 'Polônia', 'Ukraine': 'Ucrânia', 'Algeria': 'Argélia',
  'Cameroon': 'Camarões', 'Ghana': 'Gana', 'Indonesia': 'Indonésia',
  'Slovenia': 'Eslovênia', 'Qatar': 'Catar', 'Tunisia': 'Tunísia',
  "Côte d'Ivoire": 'Costa do Marfim', 'Ivory Coast': 'Costa do Marfim',
};

const STATUS_MINUTE_LABEL: Record<string, string> = {
  '1H': '1º Tempo', '2H': '2º Tempo', 'ET': 'Prorrogação',
  'PEN': 'Pênaltis', 'HT': 'Intervalo',
};

export type AlertLevel = 'low' | 'medium' | 'high' | 'critical';

export interface PressureData {
  match: FootballMatch;
  minute: number;
  probability: number;
  level: AlertLevel;
  signals: { icon: string; text: string }[];
  xGEstimated: number;
  pressureIndex: number; // 0-100
}

function t(name: string): string {
  return TEAM_PT[name] ?? name;
}

/** Estimate current match minute from status + UTC kickoff time */
function estimateMinute(status: string, dateStr: string): number {
  const elapsed = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  switch (status) {
    case '1H':  return Math.min(45, Math.max(1, elapsed));
    case 'HT':  return 45;
    case '2H':  return Math.min(90, Math.max(46, elapsed));
    case 'ET':  return Math.min(120, Math.max(91, elapsed));
    case 'PEN': return 120;
    default:    return 0;
  }
}

export function computePressure(match: FootballMatch): PressureData {
  const minute = estimateMinute(match.status, match.date);
  const home = match.team1Score ?? 0;
  const away = match.team2Score ?? 0;
  const diff = home - away;
  const totalGoals = home + away;

  let prob = 12;
  let pressure = 30;
  const signals: { icon: string; text: string }[] = [];

  // ── Timing factors ──────────────────────────────────────────────
  const minInHalf = match.status === '2H' ? minute - 45 : minute;

  if (match.status === '1H' && minInHalf >= 38) {
    prob += 12; pressure += 20;
    signals.push({ icon: '⏱️', text: `${minute}' — final do 1º tempo` });
  }
  if (match.status === '2H' && minInHalf >= 35) {
    prob += 18; pressure += 25;
    signals.push({ icon: '🔥', text: `${minute}' — minutos finais` });
  }
  if (match.status === '2H' && minInHalf >= 42) {
    prob += 8; pressure += 10;
    signals.push({ icon: '⚡', text: 'Acréscimos — urgência máxima' });
  }
  if (match.status === 'ET') {
    prob += 12; pressure += 22;
    signals.push({ icon: '💥', text: 'Prorrogação — qualquer gol é decisivo' });
  }

  // ── Score factors ────────────────────────────────────────────────
  if (diff === 0 && match.status !== 'HT') {
    prob += 8; pressure += 12;
    signals.push({ icon: '⚖️', text: 'Empate — ambos atacam para virar' });
  }
  if (Math.abs(diff) === 1) {
    prob += 10; pressure += 18;
    signals.push({ icon: '📈', text: `Time perdedor pressionando demais` });
  }
  if (Math.abs(diff) >= 3) {
    prob -= 5; pressure -= 8;
  }

  // ── xG estimation from scoring pace ────────────────────────────
  const pace = minute > 0 ? (totalGoals / minute) * 90 : 2.5;
  const xGEst = parseFloat(Math.max(0.2, Math.min(5.5, pace)).toFixed(1));

  if (xGEst >= 3.0) {
    prob += 10; pressure += 15;
    signals.push({ icon: '📊', text: `xG estimado: ${xGEst} — ritmo alto de gols` });
  } else if (xGEst >= 2.0) {
    prob += 4;
    signals.push({ icon: '📊', text: `xG estimado: ${xGEst}` });
  } else {
    signals.push({ icon: '📊', text: `xG estimado: ${xGEst}` });
  }

  // ── Pressure simulation (mimics corner/shot pressure) ──────────
  // Derived from match minute position in half: teams attack more in 2nd half
  if (match.status === '2H' && minInHalf >= 20) {
    const cornerEstimate = Math.floor(minInHalf / 8);
    if (cornerEstimate >= 3) {
      prob += 6; pressure += 10;
      signals.push({ icon: '🏁', text: `~${cornerEstimate} escanteios estimados no 2º tempo` });
    }
  }

  if (signals.length <= 1) {
    signals.push({ icon: '🟢', text: 'Jogo em andamento — monitorando sinais' });
  }

  prob     = Math.min(88, Math.max(8, Math.round(prob)));
  pressure = Math.min(100, Math.max(5, Math.round(pressure)));

  const level: AlertLevel =
    prob >= 65 ? 'critical'
    : prob >= 45 ? 'high'
    : prob >= 28 ? 'medium'
    : 'low';

  return { match, minute, probability: prob, level, signals, xGEstimated: xGEst, pressureIndex: pressure };
}

// ── Visual helpers ─────────────────────────────────────────────────
const LEVEL_CONFIG: Record<AlertLevel, {
  bg: string; border: string; badge: string; bar: string; label: string;
}> = {
  low:      { bg: 'bg-slate-900',     border: 'border-slate-800',    badge: 'bg-slate-800 text-slate-400',    bar: 'bg-slate-500',   label: 'Baixa' },
  medium:   { bg: 'bg-slate-900',     border: 'border-yellow-900/40',badge: 'bg-yellow-950 text-yellow-400',  bar: 'bg-yellow-500',  label: 'Média' },
  high:     { bg: 'bg-orange-950/30', border: 'border-orange-800/50',badge: 'bg-orange-950 text-orange-400',  bar: 'bg-orange-500',  label: 'Alta' },
  critical: { bg: 'bg-red-950/30',    border: 'border-red-700/60',   badge: 'bg-red-950 text-red-400',        bar: 'bg-red-500',     label: '🔥 Crítica' },
};

interface PressureCardProps {
  data: PressureData;
}

export function PressureCard({ data }: PressureCardProps) {
  const { match, minute, probability, level, signals, xGEstimated, pressureIndex } = data;
  const cfg = LEVEL_CONFIG[level];
  const f1 = FLAGS[match.team1] ?? '';
  const f2 = FLAGS[match.team2] ?? '';
  const n1 = t(match.team1);
  const n2 = t(match.team2);
  const statusLabel = STATUS_MINUTE_LABEL[match.status] ?? match.status;

  return (
    <div className={`rounded-2xl border p-5 transition-all ${cfg.bg} ${cfg.border}`}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 font-medium mb-1 truncate">{match.championship}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg leading-none">{f1}</span>
            <span className="font-black text-white text-sm">{n1}</span>
            <span className="font-black text-slate-400 text-sm px-1.5 py-0.5 bg-slate-800 rounded-lg">
              {match.team1Score ?? 0}–{match.team2Score ?? 0}
            </span>
            <span className="font-black text-white text-sm">{n2}</span>
            <span className="text-lg leading-none">{f2}</span>
          </div>
        </div>

        {/* Level badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 ${cfg.badge}`}>
          {level === 'critical' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
          {level === 'high' && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />}
          {cfg.label}
        </div>
      </div>

      {/* Probability display */}
      <div className="mb-4">
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
              Probabilidade de gol (5 min)
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-4xl font-black ${
                level === 'critical' ? 'text-red-400'
                : level === 'high' ? 'text-orange-400'
                : level === 'medium' ? 'text-yellow-400'
                : 'text-slate-400'
              }`}>
                {probability}%
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-600 font-semibold">{statusLabel}</p>
            <p className="text-sm font-black text-slate-400">{minute}'</p>
          </div>
        </div>

        {/* Gauge bar */}
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
            style={{ width: `${probability}%` }}
          />
        </div>
      </div>

      {/* Signals list */}
      <div className="space-y-1.5">
        {signals.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-sm leading-none">{s.icon}</span>
            <span>{s.text}</span>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="mt-3 text-[10px] text-slate-700 border-t border-slate-800/60 pt-2">
        Probabilidade calculada com base em minuto, placar e ritmo estimado de xG.
      </p>
    </div>
  );
}
