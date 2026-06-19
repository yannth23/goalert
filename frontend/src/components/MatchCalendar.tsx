'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface DayData {
  date: string; // YYYY-MM-DD
  count: number;
}

const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function intensityClass(count: number): string {
  if (count === 0) return 'bg-slate-800/50 text-slate-700';
  if (count <= 2)  return 'bg-yellow-900/60 text-yellow-500 border border-yellow-800/40';
  if (count <= 5)  return 'bg-yellow-600/30 text-yellow-400 border border-yellow-600/50';
  return 'bg-yellow-500/40 text-yellow-300 border border-yellow-500/70';
}

export function MatchCalendar() {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);

  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year  = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const monthLabel = `${MONTHS_PT[month]} ${year}`;
  const monthKey   = `${year}-${String(month + 1).padStart(2, '0')}`;

  useEffect(() => {
    setLoading(true);
    api.getCalendar(monthKey)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [monthKey]);

  const countByDate = Object.fromEntries(data.map(d => [d.date, d.count]));

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayStr = now.toISOString().split('T')[0];

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const totalGames = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-white text-sm">📅 Calendário de jogos</h3>
          {!loading && (
            <p className="text-xs text-slate-500 mt-0.5">
              {totalGames} {totalGames === 1 ? 'jogo' : 'jogos'} em {monthLabel}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonthOffset(o => o - 1)}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition flex items-center justify-center text-sm"
          >
            ‹
          </button>
          <span className="text-xs text-slate-400 font-semibold px-2 min-w-[90px] text-center">
            {monthLabel}
          </span>
          <button
            onClick={() => setMonthOffset(o => o + 1)}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition flex items-center justify-center text-sm"
          >
            ›
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array(35).fill(null).map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEK_DAYS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-slate-600 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {weeks.flat().map((day, i) => {
              if (!day) return <div key={i} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const count   = countByDate[dateStr] ?? 0;
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={i}
                  className={`relative flex flex-col items-center justify-center h-9 rounded-lg text-xs font-bold transition-all
                    ${isToday ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-900' : ''}
                    ${intensityClass(count)}`}
                >
                  <span>{day}</span>
                  {count > 0 && (
                    <span className="text-[9px] font-semibold leading-none opacity-80">{count}j</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-800">
            <span className="text-[10px] text-slate-600 font-semibold">Jogos:</span>
            {[
              { cls: 'bg-slate-800/50', label: '0' },
              { cls: 'bg-yellow-900/60 border border-yellow-800/40', label: '1–2' },
              { cls: 'bg-yellow-600/30 border border-yellow-600/50', label: '3–5' },
              { cls: 'bg-yellow-500/40 border border-yellow-500/70', label: '6+' },
            ].map(({ cls, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-4 h-4 rounded ${cls}`} />
                <span className="text-[10px] text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
