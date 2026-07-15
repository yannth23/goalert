import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BracketSeedService } from './bracket-seed.service';
import { WORLD_CUP_GROUPS, KNOCKOUT_RESULTS } from '../shared';

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

  /**
   * Calcula a classificação dos 12 grupos oficiais direto dos jogos FT já
   * sincronizados no nosso banco, e retorna também se a fase de grupos está
   * 100% completa (todos os times com 3 jogos disputados). Essa flag é a
   * trava que impede resolveRoundOf32 de gravar um time errado num slot
   * write-once por causa de classificação provisória.
   */
  private async computeLocalGroupTables(): Promise<{
    groupTables: Record<string, { teamName: string; points: number }[]>;
    groupsComplete: boolean;
  }> {
    const finishedMatches = await this.prisma.footballMatch.findMany({
      where: { status: 'FT', homeScore: { not: null }, awayScore: { not: null } },
      select: { homeTeam: true, awayTeam: true, homeScore: true, awayScore: true },
    });

    const groupTables: Record<string, { teamName: string; points: number; goalDifference: number; goalsFor: number; played: number }[]> = {};
    let allComplete = true;

    for (const [letter, teams] of Object.entries(WORLD_CUP_GROUPS)) {
      const stats: Record<string, { points: number; goalDifference: number; goalsFor: number; played: number }> = {};
      teams.forEach(t => { stats[t] = { points: 0, goalDifference: 0, goalsFor: 0, played: 0 }; });

      for (const m of finishedMatches) {
        if (!teams.includes(m.homeTeam) || !teams.includes(m.awayTeam)) continue;
        const hs = m.homeScore!, as_ = m.awayScore!;
        stats[m.homeTeam].played++; stats[m.awayTeam].played++;
        stats[m.homeTeam].goalsFor += hs; stats[m.awayTeam].goalsFor += as_;
        stats[m.homeTeam].goalDifference += hs - as_;
        stats[m.awayTeam].goalDifference += as_ - hs;
        if (hs > as_) stats[m.homeTeam].points += 3;
        else if (as_ > hs) stats[m.awayTeam].points += 3;
        else { stats[m.homeTeam].points += 1; stats[m.awayTeam].points += 1; }
      }

      // Cada time de um grupo de 4 joga 3 jogos na fase de grupos.
      const groupComplete = teams.every(t => stats[t].played >= 3);
      if (!groupComplete) allComplete = false;

      groupTables[letter] = teams
        .map(name => ({ teamName: name, ...stats[name] }))
        .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
    }

    return { groupTables, groupsComplete: allComplete };
  }

  /**
   * Congela no banco os resultados oficiais e estáticos do mata-mata
   * (KNOCKOUT_RESULTS). Jogos DONE são gravados como verdade absoluta —
   * sobrescrevem qualquer dado errado que o sync antigo tenha deixado. Slots
   * ainda vivos (semi 102 e final) só têm os times definidos, sem nunca apagar
   * um resultado que o sync ao vivo já tenha registrado. Idempotente: pode
   * rodar quantas vezes quiser.
   */
  async applyStaticResults(): Promise<{ frozen: number; opened: number }> {
    await this.seed.ensureSeeded();
    let frozen = 0;
    let opened = 0;

    for (const r of KNOCKOUT_RESULTS) {
      const slot = await this.prisma.bracketSlot.findUnique({ where: { gameNumber: r.gameNumber } });
      if (!slot) continue;

      if (r.status === 'DONE') {
        await this.prisma.bracketSlot.update({
          where: { gameNumber: r.gameNumber },
          data: {
            homeTeam:  r.homeTeam,
            awayTeam:  r.awayTeam,
            homeScore: r.homeScore,
            awayScore: r.awayScore,
            winner:    r.winner,
            status:    'DONE',
          },
        });
        frozen++;
        continue;
      }

      // RESOLVED: semi/final ainda em aberto — nunca clobbera um resultado já
      // finalizado pelo sync ao vivo.
      if (slot.status === 'DONE') continue;
      await this.prisma.bracketSlot.update({
        where: { gameNumber: r.gameNumber },
        data: {
          homeTeam: r.homeTeam ?? slot.homeTeam,
          awayTeam: r.awayTeam ?? slot.awayTeam,
          status:   slot.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'RESOLVED',
        },
      });
      opened++;
    }

    this.logger.log(`applyStaticResults: ${frozen} jogos congelados, ${opened} slots vivos definidos`);
    return { frozen, opened };
  }

  /**
   * Reseta UM slot resolvido de volta pra "não resolvido" (limpa times, placar,
   * vencedor e vínculo com o jogo). Única forma legítima de desfazer o
   * write-once — uso manual e pontual (ex: corrigir um slot gravado errado
   * antes das travas atuais existirem). Depois de resetar, rode
   * POST /bracket/apply-static ou /bracket/sync pra repreencher corretamente.
   */
  async resetSlot(gameNumber: number): Promise<{ success: boolean; gameNumber: number }> {
    const slot = await this.prisma.bracketSlot.findUnique({ where: { gameNumber } });
    if (!slot) return { success: false, gameNumber };
    await this.prisma.bracketSlot.update({
      where: { gameNumber },
      data: {
        homeTeam:  null,
        awayTeam:  null,
        homeScore: null,
        awayScore: null,
        winner:    null,
        matchId:   null,
        status:    'PENDING',
      },
    });
    this.logger.log(`resetSlot: jogo ${gameNumber} resetado`);
    return { success: true, gameNumber };
  }

  async getBracket() {
    await this.seed.ensureSeeded();
    const slots = await this.prisma.bracketSlot.findMany({ orderBy: { gameNumber: 'asc' } });

    // Nota de desempate (pênaltis/prorrogação) vem dos dados estáticos e é
    // anexada só na resposta — não é persistida no banco (evita migração de
    // schema). Só aparece em jogos já finalizados (DONE).
    const noteByGame = new Map(
      KNOCKOUT_RESULTS.filter(r => r.note).map(r => [r.gameNumber, r.note as string]),
    );
    const enriched = slots.map(s => ({
      ...s,
      note: s.status === 'DONE' ? noteByGame.get(s.gameNumber) ?? null : null,
    }));

    return {
      r32:     enriched.filter(s => s.phase === 'r32'),
      r16:     enriched.filter(s => s.phase === 'r16'),
      quartas: enriched.filter(s => s.phase === 'quartas'),
      semi:    enriched.filter(s => s.phase === 'semi'),
      final:   enriched.filter(s => s.phase === 'final'),
    };
  }

  /**
   * Resolve os nomes de time da Rd32 a partir da classificação atual dos
   * grupos. Só escreve em slots que ainda estão com homeTeam/awayTeam nulos
   * — uma vez resolvido, o nome fica congelado ali para sempre.
   */
  async resolveRoundOf32(
    groupTables: Record<string, { teamName: string }[]>,
    best8Thirds: string[],
    groupsComplete: boolean,
  ): Promise<void> {
    // TRAVA CRÍTICA: nunca resolve nenhum slot da Rd32 com classificação
    // parcial. Uma tabela de grupo com 1 ou 2 jogos disputados já tem uma
    // ordem (por pontos), mas ela pode mudar completamente no próximo jogo —
    // resolver com esse dado provisório grava um time errado no slot PARA
    // SEMPRE (write-once), e isso já causou pelo menos um bug de produção
    // (França x Paraguai apareceu na Rd32 em vez das Oitavas porque o "melhor
    // 3º" foi calculado antes da fase de grupos terminar).
    if (!groupsComplete) {
      this.logger.log('resolveRoundOf32: grupos ainda não completos, aguardando');
      return;
    }

    const r32 = await this.prisma.bracketSlot.findMany({ where: { phase: 'r32' } });
    this.logger.log(`resolveRoundOf32: ${r32.length} slots to check (grupos completos)`);

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

    // Resultado congelado é imutável: qualquer slot DONE (seja resultado
    // estático oficial ou já finalizado pelo sync ao vivo) nunca é sobrescrito.
    // Isso sustenta o bracket "estático" — o sync só preenche o que ainda está
    // em aberto (times vivos das semis/final).
    if (slot.status === 'DONE') return;

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
    // Quartas (97-100) -> Semi (101-102).
    // CORREÇÃO (árvore FIFA 2026): o mapeamento sequencial (97,98->101 e
    // 99,100->102) montava França×Inglaterra e Espanha×Argentina. A árvore
    // real cruza os chaveamentos: 101 = QF97×QF99 (França×Espanha) e
    // 102 = QF98×QF100 (Inglaterra×Argentina).
    if (gameNumber === 97)  return { gameNumber: 101, side: 'home' };
    if (gameNumber === 99)  return { gameNumber: 101, side: 'away' };
    if (gameNumber === 98)  return { gameNumber: 102, side: 'home' };
    if (gameNumber === 100) return { gameNumber: 102, side: 'away' };
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
  async syncFromDatabase(externalStandings: { group: string; table: { teamName: string; points: number }[] }[]): Promise<void> {
    this.logger.log(`syncFromDatabase called with ${externalStandings.length} external groups`);

    // Fonte PRIMÁRIA e ÚNICA de verdade: jogos de fase de grupos já
    // sincronizados no nosso próprio banco (FootballMatch, status FT). Não
    // depende de ESPN/Football-Data terem essa Copa cadastrada — e mais
    // importante, sabemos com certeza quantos jogos (played) cada time
    // disputou, o que é exatamente o dado que faltava pra evitar resolver
    // o bracket com classificação provisória.
    const { groupTables, groupsComplete } = await this.computeLocalGroupTables();

    const allThirds = Object.values(groupTables)
      .map(table => table[2])
      .filter((t): t is { teamName: string; points: number } => !!t)
      .sort((a, b) => b.points - a.points)
      .slice(0, 8)
      .map(t => t.teamName);

    this.logger.log(`Local group tables: ${Object.keys(groupTables).length} groups, groupsComplete=${groupsComplete}, ${allThirds.length} best thirds`);
    await this.resolveRoundOf32(groupTables, allThirds, groupsComplete);

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

