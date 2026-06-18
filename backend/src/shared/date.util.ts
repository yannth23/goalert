/**
 * Shared date utilities used across job services and match queries.
 */

const SAO_PAULO_TZ = 'America/Sao_Paulo';

export interface DayRange {
  start: Date;
  end: Date;
}

/** Returns start/end of the current day in São Paulo timezone. */
export function getTodayRange(): DayRange {
  const now = new Date();
  const spTime = new Date(now.toLocaleString('en-US', { timeZone: SAO_PAULO_TZ }));

  const start = new Date(spTime);
  start.setHours(0, 0, 0, 0);

  const end = new Date(spTime);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/** Formats a Date to HH:MM in America/Recife timezone (same offset as São Paulo). */
export function formatMatchTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Recife',
  });
}
