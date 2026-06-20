/**
 * Shared date utilities used across job services and match queries for Taticad.
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
 * Returns start/end of the current day in São Paulo timezone as UTC Date objects for Taticad.
 * BRT = UTC-3, so midnight BRT = 03:00 UTC.
 */
export function getTodayRange(): DayRange {
  const dateStr = getTodayBrazil(); // ex: "2026-06-19"
  // Começa à meia-noite de hoje (BRT)
  const start = new Date(`${dateStr}T00:00:00-03:00`);
  // Termina 27 horas após o início, cobrindo jogos que se estendem até a madrugada do dia seguinte.
  // Isso garante que jogos que começam à meia-noite (00:00) ou logo depois apareçam na lista de "hoje"
  const end = new Date(start.getTime() + 27 * 60 * 60 * 1000); 
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
