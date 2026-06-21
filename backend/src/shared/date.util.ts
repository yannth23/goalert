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
  // Começa estritamente à meia-noite de hoje no horário de Brasília (BRT)
  // BRT é UTC-3, então 00:00 BRT é 03:00 UTC.
  const start = new Date(`${dateStr}T00:00:00-03:00`);
  // Termina às 23:59:59 do mesmo dia em Brasília
  const end = new Date(`${dateStr}T23:59:59-03:00`);
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
