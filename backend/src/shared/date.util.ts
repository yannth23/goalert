/**
 * Shared date utilities used across job services and match queries for TactiqSense.
 * All day ranges are computed in America/SaoPaulo (BRT = UTC-3).
 */

const SAO_PAULO_TZ = 'America/Sao_Paulo';

export interface DayRange {
  start: Date;
  end: Date;
}

/** Returns today's date string (YYYY-MM-DD) in São Paulo timezone. */
export function getTodayBrazil(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Returns start/end of the current day in São Paulo timezone as UTC Date objects for TactiqSense.
 * BRT = UTC-3, so midnight BRT = 03:00 UTC.
 */
export function getTodayRange(): DayRange {
  const dateStr = getTodayBrazil(); // ex: "2026-06-19"
  // Começa à meia-noite de ontem (BRT) para cobrir jogos que podem estar em datas diferentes no servidor
  const baseDate = new Date(`${dateStr}T00:00:00-03:00`);
  const start = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000);
  // Termina 48 horas depois
  const end = new Date(start.getTime() + 48 * 60 * 60 * 1000); 
  return { start, end };
}

/** Formats a Date to HH:MM in Brazil timezone. */
export function formatMatchTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SAO_PAULO_TZ,
  });
}
