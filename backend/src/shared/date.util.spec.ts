import { getTodayRange, getTodayBrazil } from './date.util';

describe('date.util — timezone regression guard', () => {

  // Este describe existe porque o bug de timezone (jogo da Copa sumindo ou
  // duplicando por causa de UTC vs BRT) já foi corrigido e reintroduzido
  // silenciosamente múltiplas vezes neste projeto. Se um teste aqui falhar,
  // NÃO simplifique a lógica de date.util.ts para "consertar" o teste —
  // volte e releia os comentários em date.util.ts primeiro.

  describe('getTodayBrazil', () => {
    it('returns a string in YYYY-MM-DD format', () => {
      expect(getTodayBrazil()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getTodayRange — must span exactly 27 hours, not 24', () => {
    it('spans exactly 27 hours between start and end', () => {
      const { start, end } = getTodayRange();
      const diffMs = end.getTime() - start.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      // 26.999... por causa do :59 no segundo final — tolerância de 1s
      expect(diffHours).toBeGreaterThan(26.99);
      expect(diffHours).toBeLessThanOrEqual(27);
    });

    it('start corresponds to 00:00:00 BRT (03:00:00 UTC)', () => {
      const { start } = getTodayRange();
      // BRT é sempre UTC-3 (sem horário de verão desde 2019), então
      // meia-noite BRT é sempre 03:00 UTC.
      expect(start.getUTCHours()).toBe(3);
      expect(start.getUTCMinutes()).toBe(0);
    });

    it('end corresponds to 02:59:59 BRT of the FOLLOWING day (05:59:59 UTC)', () => {
      const { start, end } = getTodayRange();
      expect(end.getUTCHours()).toBe(5);
      expect(end.getUTCMinutes()).toBe(59);
      expect(end.getUTCSeconds()).toBe(59);
      // end deve estar no dia seguinte ao start em UTC
      const startDay = start.getUTCDate();
      const endDay = end.getUTCDate();
      // Considera virada de mês: se end.getUTCDate() < start.getUTCDate(),
      // o mês virou, o que também é válido.
      expect(endDay === startDay + 1 || endDay < startDay).toBe(true);
    });

    it('a match at 00:30 BRT (late-night game) falls within the range', () => {
      const { start, end } = getTodayRange();
      // Simula um jogo do Brasil às 21:30 BRT que vira 00:30 BRT do dia seguinte
      // em UTC: 21:30 BRT = 00:30 UTC do dia seguinte.
      const todayStr = getTodayBrazil();
      const lateNightMatchUtc = new Date(`${todayStr}T23:30:00-03:00`); // 23:30 BRT hoje
      const afterMidnightMatchUtc = new Date(lateNightMatchUtc.getTime() + 60 * 60 * 1000); // +1h = 00:30 BRT amanhã

      expect(afterMidnightMatchUtc.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(afterMidnightMatchUtc.getTime()).toBeLessThanOrEqual(end.getTime());
    });

    it('a match at 03:30 BRT (well past the 27h window) falls OUTSIDE the range', () => {
      const { end } = getTodayRange();
      const todayStr = getTodayBrazil();
      const wayTooLateMatch = new Date(`${todayStr}T23:30:00-03:00`);
      const at0330 = new Date(wayTooLateMatch.getTime() + 4 * 60 * 60 * 1000); // +4h = 03:30 BRT amanhã

      expect(at0330.getTime()).toBeGreaterThan(end.getTime());
    });
  });
});
