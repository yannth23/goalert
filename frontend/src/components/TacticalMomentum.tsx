'use client';
import { useEffect, useMemo, useState } from 'react';
import { FootballMatch } from '../types';
import { traduzirTime } from '../lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────
const LIVE = new Set(['1H', 'HT', '2H', 'ET', 'PEN']);
const W = 400; const H = 100;
const PL = 8; const PR = 8; const PT = 8; const PB = 8;
const IW = W - PL - PR; const IH = H - PT - PB;

// ── Helpers ───────────────────────────────────────────────────────────────────
function estimateMinute(match: FootballMatch): number {
  const elapsed = Math.floor((Date.now() - new Date(match.date).getTime()) / 60_000);
  switch (match.status) {
    case '1H':  return Math.min(47, Math.max(1, elapsed));
    case 'HT':  return 45;
    case '2H':  return Math.min(92, Math.max(46, 45 + Math.max(1, elapsed - 62)));
    case 'ET':  return Math.min(120, Math.max(91, elapsed));
    case 'PEN': return 120;
    case 'FT':  return 90;
    default:    return 0;
  }
}

function calcDom(base: number, hG: number, aG: number, min: number, status: string): number {
  const diff     = hG - aG;
  const scoreAdj = Math.max(-24, Math.min(24, diff * 8));
  let pressAdj   = 0;
  const late     = status === '2H' || status === 'ET';
  if (late && min >= 65) {
    const u = Math.min(1, (min - 65) / 22);
    if (diff < 0) pressAdj = +(u * 11);
    if (diff > 0) pressAdj = -(u * 11);
  }
  return Math.round(Math.min(85, Math.max(15, base + scoreAdj + pressAdj)));
}

function buildCurve(
  base: number, hG: number, aG: number,
  minute: number, status: string, total: number,
): { t: number; dom: number }[] {
  const pts: { t: number; dom: number }[] = [];
  const STEPS = 40;
  for (let s = 0; s <= STEPS; s++) {
    const t  = (s / STEPS) * minute;
    const f  = minute > 0 ? t / minute : 0;
    pts.push({ t, dom: calcDom(base, Math.round(hG * f ** 0.8), Math.round(aG * f ** 0.8), t, status) });
  }
  pts.push({ t: minute, dom: calcDom(base, hG, aG, minute, status) });
  return pts;
}

function toPolyline(pts: { t: number; dom: number }[], total: number): string {
  return pts.map(({ t, dom }) => {
    const x = PL + (t / total) * IW;
    const y = PT + ((85 - dom) / 70) * IH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function statusLabel(status: string, min: number): string {
  if (status === 'HT')  return 'Intervalo';
  if (status === 'ET')  return `Prorrog. ${min}'`;
  if (status === 'PEN') return 'Pênaltis';
  if (status === 'FT')  return 'Encerrado';
  if (min > 0)          return `${min}'`;
  return '';
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props { match: FootballMatch }

export function TacticalMomentum({ match }: Props) {
  const [tick, setTick] = useState(0);
  const isLive = LIVE.has(match.status);

  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, [isLive]);

  const base     = match.tactics?.home?.gameDominanceProb ?? 55;
  const hGoals   = match.team1Score ?? 0;
  const aGoals   = match.team2Score ?? 0;
  const total    = match.status === 'ET' || match.status === 'PEN' ? 120 : 90;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const minute   = useMemo(() => estimateMinute(match), [match.status, match.date, tick]);
  const curDom   = calcDom(base, hGoals, aGoals, minute, match.status);
  const curve    = useMemo(
    () => buildCurve(base, hGoals, aGoals, minute, match.status, total),
    [base, hGoals, aGoals, minute, match.status, total],
  );

  const polyline = toPolyline(curve, total);
  const midY     = PT + ((85 - 50) / 70) * IH;
  const baseY    = PT + ((85 - base) / 70) * IH;
  const dotX     = PL + (Math.min(minute, total) / total) * IW;
  const dotY     = PT + ((85 - curDom) / 70) * IH;
  const htX      = PL + (45 / total) * IW;

  const homeName = traduzirTime(match.team1);
  const awayName = traduzirTime(match.team2);

  const diff = curDom - 50;
  const momentumLabel =
    diff > 15 ? `${homeName} domina` :
    diff >  5 ? `${homeName} à frente` :
    diff < -15? `${awayName} domina` :
    diff <  -5? `${awayName} à frente` :
    'Equilíbrio tático';

  const lineColor = curDom >= 50 ? '#f59e0b' : '#818cf8';

  const homeTrailing = hGoals < aGoals && (match.status === '2H' || match.status === 'ET') && minute >= 65;
  const awayTrailing = aGoals < hGoals && (match.status === '2H' || match.status === 'ET') && minute >= 65;
  const pressingTeam = homeTrailing ? homeName : awayTrailing ? awayName : null;

  // Build SVG fill path (area under/above curve down to 50% line)
  const firstPt = curve[0];
  const lastPt  = curve[curve.length - 1];
  const f0x     = (PL).toFixed(1);
  const f0y     = (PT + ((85 - firstPt.dom) / 70) * IH).toFixed(1);
  const flx     = (PL + (Math.min(lastPt.t, total) / total) * IW).toFixed(1);
  const fillPath = `M ${f0x},${midY.toFixed(1)} L ${f0x},${f0y} ${
    polyline.split(' ').slice(1).join(' ')
  } L ${flx},${midY.toFixed(1)} Z`;

  return (
    <div className="bg-slate-800/20 border border-slate-700/30 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/30 bg-slate-800/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-white">📈 Momentum Tático</span>
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              AO VIVO
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pressingTeam && (
            <span className="text-[10px] font-bold text-orange-400 bg-orange-400/10 border border-orange-400/20 rounded-full px-2 py-0.5 animate-pulse">
              🔥 {pressingTeam} pressiona
            </span>
          )}
          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
            {statusLabel(match.status, minute)}
          </span>
        </div>
      </div>

      {/* Momentum bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between text-[10px] font-bold mb-1.5">
          <span className="text-amber-400 truncate max-w-[38%]">{homeName}</span>
          <span className={`font-black text-xs ${curDom >= 55 ? 'text-amber-300' : curDom <= 45 ? 'text-indigo-300' : 'text-slate-300'}`}>
            {momentumLabel}
          </span>
          <span className="text-indigo-400 truncate max-w-[38%] text-right">{awayName}</span>
        </div>
        <div className="h-5 rounded-full overflow-hidden bg-slate-800 flex relative">
          <div
            className="h-full bg-gradient-to-r from-amber-700 to-amber-400 transition-all duration-700 ease-out"
            style={{ width: `${curDom}%` }}
          />
          <div className="h-full flex-1 bg-gradient-to-r from-indigo-500 to-indigo-800" />
          <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-slate-900/60 -translate-x-1/2" />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-white/90 tabular-nums">{curDom}%</span>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-white/90 tabular-nums">{100 - curDom}%</span>
        </div>
      </div>

      {/* SVG Timeline */}
      <div className="px-4 pb-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 76 }}
          preserveAspectRatio="none"
        >
          {/* Zone backgrounds */}
          <rect x={PL} y={PT} width={IW} height={midY - PT} fill="rgba(251,191,36,0.05)" />
          <rect x={PL} y={midY} width={IW} height={PT + IH - midY} fill="rgba(99,102,241,0.05)" />

          {/* Neutral 50% line */}
          <line x1={PL} y1={midY} x2={PL + IW} y2={midY}
            stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" strokeDasharray="5,5" />

          {/* Pre-match baseline */}
          <line x1={PL} y1={baseY} x2={PL + IW} y2={baseY}
            stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" strokeDasharray="2,8" />

          {/* HT separator */}
          {minute > 45 && (
            <line x1={htX} y1={PT} x2={htX} y2={PT + IH}
              stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          )}

          {/* Area fill */}
          {polyline && <path d={fillPath} fill={curDom >= 50 ? 'rgba(251,191,36,0.1)' : 'rgba(99,102,241,0.1)'} />}

          {/* Curve */}
          {polyline && (
            <polyline points={polyline} fill="none" stroke={lineColor} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Current position */}
          {polyline && minute > 0 && (
            <>
              <line x1={dotX} y1={PT} x2={dotX} y2={PT + IH}
                stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" strokeDasharray="3,3" />
              <circle cx={dotX} cy={dotY} r="6" fill={lineColor} opacity="0.2" />
              <circle cx={dotX} cy={dotY} r="3.5" fill={lineColor} />
              <circle cx={dotX} cy={dotY} r="1.5" fill="white" />
            </>
          )}

          {/* HT label */}
          {minute > 45 && (
            <text x={htX + 3} y={PT + 8} fontSize="6" fill="rgba(255,255,255,0.2)" fontFamily="monospace">HT</text>
          )}
        </svg>

        {/* Axis labels */}
        <div className="flex justify-between text-[9px] text-slate-600 font-mono -mt-0.5 px-1">
          <span>0'</span>
          {total === 90 && <span>45'</span>}
          {total === 120 && <span style={{ marginLeft: '37%' }}>45'</span>}
          {total === 120 && <span>90'</span>}
          <span>{total}'</span>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3 text-[10px] text-slate-600">
            <span className="flex items-center gap-1">
              <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="2,4"/></svg>
              Previsão IA
            </span>
            <span className="flex items-center gap-1">
              <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke={lineColor} strokeWidth="2" strokeLinecap="round"/></svg>
              Momentum
            </span>
          </div>
          {isLive && <span className="text-[9px] text-slate-600">↻ 30s</span>}
        </div>
      </div>
    </div>
  );
}
