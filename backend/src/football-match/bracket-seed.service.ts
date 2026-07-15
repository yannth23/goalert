import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Fixture ESTÁTICO e oficial da Rd. de 32 da Copa do Mundo FIFA 2026.
 * Isso é gravado UMA VEZ no banco (via ensureSeeded) e nunca recalculado.
 * Se precisar corrigir um erro de digitação aqui, corrija e rode
 * POST /bracket/reseed manualmente — não existe recálculo automático.
 */
const ROUND_OF_32_FIXTURE: { gameNumber: number; homeSlot: string; awaySlot: string }[] = [
  { gameNumber: 73, homeSlot: '2A', awaySlot: '2B' },
  { gameNumber: 74, homeSlot: '1E', awaySlot: '3ABCDF' },
  { gameNumber: 75, homeSlot: '1F', awaySlot: '2C' },
  { gameNumber: 76, homeSlot: '1C', awaySlot: '2F' },
  { gameNumber: 77, homeSlot: '1I', awaySlot: '3CDFGH' },
  { gameNumber: 78, homeSlot: '2E', awaySlot: '2I' },
  { gameNumber: 79, homeSlot: '1A', awaySlot: '3CEFHI' },
  { gameNumber: 80, homeSlot: '1L', awaySlot: '3EHIJK' },
  { gameNumber: 81, homeSlot: '1D', awaySlot: '3BEFIJ' },
  { gameNumber: 82, homeSlot: '1G', awaySlot: '3AEHIJ' },
  { gameNumber: 83, homeSlot: '2K', awaySlot: '2L' },
  { gameNumber: 84, homeSlot: '1H', awaySlot: '2J' },
  { gameNumber: 85, homeSlot: '1B', awaySlot: '3EFGIJ' },
  { gameNumber: 86, homeSlot: '1J', awaySlot: '2H' },
  { gameNumber: 87, homeSlot: '1K', awaySlot: '3DEIJL' },
  { gameNumber: 88, homeSlot: '2D', awaySlot: '2G' },
];

/**
 * Pares oficiais (não-sequenciais) que formam a Rd. de 16 a partir dos vencedores
 * da Rd32. A ordem posiciona cada par no jogo 89..96.
 *
 * CORREÇÃO (árvore FIFA 2026): o quadrante K/L estava com [83,84] e [85,87],
 * que montava Espanha×Colômbia e Suíça×Portugal. O correto é [84,87]
 * (Espanha×Portugal, jogo 94) e [83,85] (Colômbia×Suíça, jogo 96).
 */
const ROUND_OF_16_PAIRS: [number, number][] = [
  [73, 75], [74, 77], [76, 78], [79, 80],
  [81, 82], [84, 87], [86, 88], [83, 85],
];

@Injectable()
export class BracketSeedService {
  private readonly logger = new Logger(BracketSeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Garante que os 31 slots do bracket existem no banco. Idempotente: só cria
   * o que ainda não existe (upsert por gameNumber). NUNCA sobrescreve um slot
   * que já tem homeTeam/awayTeam preenchidos — essa é a garantia de "não sai
   * mais do lugar" que sustenta a persistência do bracket.
   */
  async ensureSeeded(): Promise<void> {
    const allSlots = [
      ...ROUND_OF_32_FIXTURE.map(s => ({ ...s, phase: 'r32' })),
      // Rd16, QF, Semi, Final começam vazios ("" / "") — são preenchidos
      // pelo BracketProgressService conforme a fase anterior termina.
      ...Array.from({ length: 8 },  (_, i) => ({ gameNumber: 89 + i,  phase: 'r16',     homeSlot: '', awaySlot: '' })),
      ...Array.from({ length: 4 },  (_, i) => ({ gameNumber: 97 + i,  phase: 'quartas', homeSlot: '', awaySlot: '' })),
      ...Array.from({ length: 2 },  (_, i) => ({ gameNumber: 101 + i, phase: 'semi',    homeSlot: '', awaySlot: '' })),
      { gameNumber: 104, phase: 'final', homeSlot: '', awaySlot: '' },
    ];

    let created = 0;
    for (const slot of allSlots) {
      const existing = await this.prisma.bracketSlot.findUnique({ where: { gameNumber: slot.gameNumber } });
      if (existing) continue; // já existe — nunca sobrescreve
      await this.prisma.bracketSlot.create({
        data: {
          gameNumber: slot.gameNumber,
          phase:      slot.phase,
          homeSlot:   slot.homeSlot,
          awaySlot:   slot.awaySlot,
          status:     'PENDING',
        },
      });
      created++;
    }
    if (created > 0) this.logger.log(`Bracket seed: ${created} slots criados`);
  }

  getRoundOf16Pairs(): [number, number][] {
    return ROUND_OF_16_PAIRS;
  }
}
