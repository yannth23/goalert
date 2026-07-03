/**
 * Shared date utilities used across job services and match queries for TactiqSense.
 * All day ranges are computed in America/Sao_Paulo (BRT = UTC-3).
 *
 * LÓGICA DE 27 HORAS:
 * O "dia" vai de 00:00 BRT até 02:59:59 BRT do dia SEGUINTE (27 horas, não 24).
 * Jogos da madrugada (00h-02h59 BRT) pertencem tanto ao dia anterior quanto ao
 * dia atual na visão do usuário — eles não podem sumir da listagem só porque
 * o relógio virou meia-noite. Essa é a razão de existir desta função; não
 * simplifique para um range de 24h sem entender esse motivo primeiro.
 */

const SAO_PAULO_TZ = 'America/Sao_Paulo';
const BRT_OFFSET = '-03:00';

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

/** Returns the date string (YYYY-MM-DD) one day after the given date string. */
export function addOneDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().split('T')[0];
}

/** Returns the date string (YYYY-MM-DD) one day before the given date string. */
export function subtractOneDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().split('T')[0];
}

/**
 * Returns a 27-hour day range in São Paulo timezone as UTC Date objects.
 *
 * Start: 00:00:00 BRT do dia atual
 * End:   02:59:59 BRT do dia SEGUINTE (3 horas extras além da meia-noite)
 *
 * BRT = UTC-3, então 00:00 BRT = 03:00 UTC e 02:59:59 BRT (dia+1) = 05:59:59 UTC (dia+1).
 */
export function getTodayRange(): DayRange {
  const dateStr = getTodayBrazil();      // ex: "2026-06-21"
  const nextDateStr = addOneDay(dateStr); // ex: "2026-06-22"

  const start = new Date(`${dateStr}T00:00:00${BRT_OFFSET}`);
  const end   = new Date(`${nextDateStr}T02:59:59${BRT_OFFSET}`);
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
