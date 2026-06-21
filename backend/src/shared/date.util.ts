/**
 * Shared date utilities used across job services and match queries for TactiqSense.
 * All day ranges are computed in America/SaoPaulo (BRT = UTC-3).
 *
 * LÓGICA DE 27 HORAS:
 * O "dia" vai de 00:00 BRT até 02:59:59 BRT do dia seguinte.
 * Jogos da madrugada (00h–02h59 BRT) pertencem ao dia anterior E ao dia atual —
 * eles não somem da listagem só porque a data virou.
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
 * Returns a 27-hour day range in São Paulo timezone as UTC Date objects.
 *
 * Start: 00:00 BRT do dia atual
 * End:   02:59:59 BRT do dia seguinte (3 horas extras além da meia-noite)
 *
 * Isso garante que jogos da madrugada (00h00–02h59 BRT) apareçam no dia correto,
 * pois culturalmente ainda pertencem à programação do dia anterior.
 * BRT = UTC-3, então 00:00 BRT = 03:00 UTC e 02:59 BRT (do dia+1) = 05:59 UTC (do dia+1).
 */
export function getTodayRange(): DayRange {
  const dateStr = getTodayBrazil(); // ex: "2026-06-21"
  const start = new Date(`${dateStr}T00:00:00-03:00`);
  // Fim do dia normal (23:59:59 BRT) + 3 horas = 02:59:59 BRT do dia seguinte (27h no total)
  const endOfDay = new Date(`${dateStr}T23:59:59-03:00`);
  const end = new Date(endOfDay.getTime() + 3 * 60 * 60 * 1000);
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
