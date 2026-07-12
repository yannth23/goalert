import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BracketSeedService } from './bracket-seed.service';

/**
 * Único serviço com permissão de escrever em BracketSlot depois do seed inicial.
 *
 * REGRA DE OURO (repetida aqui de propósito): um slot com homeTeam/awayTeam
 * já preenchidos NUNCA é sobrescrito. Esse serviço só PREENCHE campos vazios
 * ou AVANÇA status (PENDING → RESOLVED → IN_PROGRESS → DONE). Se você está
 * tentado a "recalcular tudo do zero" pra corrigir um dado errado, pare —
 * corrija o dado errado direto no banco ou via endpoint administrativo, e
 * deixe o resto do bracket intocado.
 */
@Injectable()
export class BracketService {
  private readonly logger = new Logger(BracketService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly seed: BracketSeedService,
  ) {}

  async getBracket() {
    await this.seed.ensureSeeded();
    const slots = await this.prisma.bracketSlot.findMany({ orderBy: { gameNumber: 'asc' } });
    return {
      r32:     slots.filter(s => s.phase === 'r32'),
      r16:     slots.filter(s => s.phase === 'r16'),
      quartas: slots.filter(s => s.phase === 'quartas'),
      semi:    slots.filter(s => s.phase === 'semi'),
      final:   slots.filter(s => s.phase === 'final'),
    };
  }

  /**
   * Resolve os nomes de time da Rd32 a partir da classificação atual dos
   * grupos. Só escreve em slots que ainda estão com homeTeam/awayTeam nulos
   * — uma vez resolvido, o nome fica congelado ali para sempre.
   */
  async resolveRoundOf32(groupTables: Record<string, { teamName: string }[]>, best8Thirds: string[]): Promise<void> {
    const r32 = await this.prisma.bracketSlot.findMany({ where: { phase: 'r32' } });
    this.logger.log(`resolveRoundOf32: ${r32.length} slots to check`);

    const usedThirds = new Set<string>();
    let resolved = 0;

    for (const slot of r32) {
      if (slot.homeTeam && slot.awayTeam) continue; // já resolvido, imutável

      const home = this.resolveSlotNotation(slot.homeSlot, groupTables, best8Thirds, usedThirds);
      const away = this.resolveSlotNotation(slot.awaySlot, groupTables, best8Thirds, usedThirds);

      this.logger.log(`Slot ${slot.gameNumber}: ${slot.homeSlot} -> ${home}, ${slot.awaySlot} -> ${away}`);

      if (!home || !away) continue; // ainda não dá pra resolver, tenta de novo depois

      await this.prisma.bracketSlot.update({
        where: { id: slot.id },
        data: { homeTeam: home, awayTeam: away, status: 'RESOLVED' },
      });
      resolved++;
    }
    if (resolved > 0) this.logger.log(`Rd32: ${resolved} slots resolvidos`);
  }

  private resolveSlotNotation(
    notation: string,
    groupTables: Record<string, { teamName: string }[]>,
    best8Thirds: string[],
    usedThirds: Set<string>,
  ): string | null {
    const direct = notation.match(/^([12])([A-L])$/);
    if (direct) {
      const pos = parseInt(direct[1]);
      const letter = direct[2];
      return groupTables[letter]?.[pos - 1]?.teamName ?? null;
    }
    if (notation.startsWith('3')) {
      const eligibleLetters = notation.slice(1).split('');
      const candidate = best8Thirds.find(name => {
        if (usedThirds.has(name)) return false;
        return eligibleLetters.some(letter => groupTables[letter]?.[2]?.teamName === name);
      });
      if (candidate) { usedThirds.add(candidate); return candidate; }
      return null;
    }
    return null;
  }

  /**
   * Vincula um jogo real (FootballMatch) a um slot já resolvido, quando os
   * dois times batem. Atualiza placar/status ao vivo. Quando o jogo termina
   * (FT), marca o vencedor e DONE — e então tenta empurrar esse vencedor pra
   * a fase seguinte, preenchendo o próximo slot vazio.
   */
  async syncMatchIntoSlot(matchId: string, team1: string, team2: string, score1: number | null, score2: number | null, status: string): Promise<void> {
    const slot = await this.prisma.bracketSlot.findFirst({
      where: {
        OR: [
          { homeTeam: team1, awayTeam: team2 },
          { homeTeam: team2, awayTeam: team1 },
        ],
      },
    });
    if (!slot) return; // não é um jogo de mata-mata, ou slot ainda não resolvido

    // Se esse slot JÁ está DONE e vinculado a outro matchId, nunca sobrescreve
    // (protege contra o mesmo par de times jogando duas vezes na história).
    if (slot.status === 'DONE' && slot.matchId && slot.matchId !== matchId) return;

    const isDone = status === 'FT';
    let winner: string | null = slot.winner;
    if (isDone && score1 !== null && score2 !== null && score1 !== score2) {
      const homeIsTeam1 = slot.homeTeam === team1;
      const homeScore = homeIsTeam1 ? score1 : score2;
      const awayScore = homeIsTeam1 ? score2 : score1;
      winner = homeScore > awayScore ? slot.homeTeam : slot.awayTeam;
    }

    await this.prisma.bracketSlot.update({
      where: { id: slot.id },
      data: {
        matchId,
        homeScore: slot.homeTeam === team1 ? score1 : score2,
        awayScore: slot.homeTeam === team1 ? score2 : score1,
        status: isDone ? 'DONE' : 'IN_PROGRESS',
        winner: winner ?? slot.winner,
      },
    });

    if (isDone && winner) {
      await this.advanceWinner(slot.gameNumber, winner);
    }
  }

  /** Empurra o vencedor de um jogo pra o próximo slot vazio da fase seguinte. */
  private async advanceWinner(fromGameNumber: number, winner: string): Promise<void> {
    const nextSlotInfo = this.getNextSlotFor(fromGameNumber);
    if (!nextSlotInfo) return; // era a final, não avança mais nada

    const { gameNumber, side } = nextSlotInfo;
    const nextSlot = await this.prisma.bracketSlot.findUnique({ where: { gameNumber } });
    if (!nextSlot) return;

    // Já preenchido esse lado? Não sobrescreve.
    if (side === 'home' && nextSlot.homeTeam) return;
    if (side === 'away' && nextSlot.awayTeam) return;

    await this.prisma.bracketSlot.update({
      where: { gameNumber },
      data: side === 'home' ? { homeTeam: winner } : { awayTeam: winner },
    });
    this.logger.log(`Vencedor do jogo ${fromGameNumber} (${winner}) avançou para o jogo ${gameNumber}`);
  }

  /** Mapa estático de qual jogo alimenta qual — espelha ROUND_OF_16_PAIRS e a árvore padrão de mata-mata. */
  private getNextSlotFor(gameNumber: number): { gameNumber: number; side: 'home' | 'away' } | null {
    const r16Pairs = this.seed.getRoundOf16Pairs();
    for (let i = 0; i < r16Pairs.length; i++) {
      const [a, b] = r16Pairs[i];
      if (gameNumber === a) return { gameNumber: 89 + i, side: 'home' };
      if (gameNumber === b) return { gameNumber: 89 + i, side: 'away' };
    }
    // Rd16 (89-96) -> Quartas (97-100): pares sequenciais
    if (gameNumber >= 89 && gameNumber <= 96) {
      const idx = gameNumber - 89;
      return { gameNumber: 97 + Math.floor(idx / 2), side: idx % 2 === 0 ? 'home' : 'away' };
    }
    // Quartas (97-100) -> Semi (101-102)
    if (gameNumber >= 97 && gameNumber <= 100) {
      const idx = gameNumber - 97;
      return { gameNumber: 101 + Math.floor(idx / 2), side: idx % 2 === 0 ? 'home' : 'away' };
    }
    // Semi (101-102) -> Final (104)
    if (gameNumber === 101) return { gameNumber: 104, side: 'home' };
    if (gameNumber === 102) return { gameNumber: 104, side: 'away' };
    return null;
  }

  /**
   * Orquestrador único, chamado pelo cron. Lê standings + jogos do banco e
   * empurra pro bracket. Idempotente e seguro de rodar quantas vezes quiser —
   * toda a proteção contra sobrescrita já está em resolveRoundOf32 e
   * syncMatchIntoSlot. Isso NÃO recalcula o bracket inteiro: só preenche o
   * que ainda está vazio e avança o que acabou de terminar.
   */
  async syncFromDatabase(standings: { group: string; table: { teamName: string; points: number }[] }[]): Promise<void> {
    this.logger.log(`syncFromDatabase called with ${standings.length} groups`);
    
    if (standings.length > 0) {
      const groupTables: Record<string, { teamName: string }[]> = {};
      for (const g of standings) {
        const letter = (g.group.match(/([A-L])\s*$/i)?.[1] ?? g.group).toUpperCase();
        groupTables[letter] = g.table.map(t => ({ teamName: t.teamName }));
      }
      const allThirds = standings
        .map(g => g.table[2])
        .filter((t): t is { teamName: string; points: number } => !!t)
        .sort((a, b) => b.points - a.points)
        .slice(0, 8)
        .map(t => t.teamName);

      this.logger.log(`Group tables built: ${Object.keys(groupTables).length} groups, ${allThirds.length} best thirds`);
      await this.resolveRoundOf32(groupTables, allThirds);
    }

    // Sincroniza placar/status de todos os jogos que já batem com algum slot resolvido.
    const resolvedSlots = await this.prisma.bracketSlot.findMany({
      where: { homeTeam: { not: null }, awayTeam: { not: null } },
    });
    if (resolvedSlots.length === 0) return;

    const teamNames = new Set<string>();
    resolvedSlots.forEach(s => { if (s.homeTeam) teamNames.add(s.homeTeam); if (s.awayTeam) teamNames.add(s.awayTeam); });

    const candidateMatches = await this.prisma.footballMatch.findMany({
      where: {
        OR: [
          { homeTeam: { in: Array.from(teamNames) } },
          { awayTeam: { in: Array.from(teamNames) } },
        ],
      },
      orderBy: { date: 'desc' },
    });

    for (const match of candidateMatches) {
      await this.syncMatchIntoSlot(
        match.id, match.homeTeam, match.awayTeam,
        match.homeScore, match.awayScore, match.status,
      );
    }
  }
}
