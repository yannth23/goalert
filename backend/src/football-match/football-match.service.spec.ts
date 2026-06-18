import { FootballMatchService } from './football-match.service';
import { PrismaService } from '../prisma/prisma.service';
import { FootballApiService } from './football-api.service';

describe('FootballMatchService', () => {
  let service: FootballMatchService;
  let prisma: Record<string, any>;
  let footballApi: Partial<Record<keyof FootballApiService, jest.Mock>>;

  beforeEach(() => {
    prisma = {
      footballMatch: {
        findMany: jest.fn(),
      },
    };
    footballApi = {
      getStandings: jest.fn(),
      getTopScorers: jest.fn(),
    };
    service = new FootballMatchService(
      prisma as unknown as PrismaService,
      footballApi as unknown as FootballApiService,
    );
  });

  describe('getTodayMatches', () => {
    it('should return mapped matches for today', async () => {
      const dbMatches = [
        {
          id: '1',
          date: new Date('2026-06-18T15:00:00Z'),
          championship: 'World Cup',
          homeTeam: 'Brazil',
          awayTeam: 'Germany',
          status: 'NS',
          homeScore: null,
          awayScore: null,
          externalId: '100',
        },
      ];
      prisma.footballMatch.findMany.mockResolvedValue(dbMatches);

      const result = await service.getTodayMatches();

      expect(prisma.footballMatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
          }),
          orderBy: { date: 'asc' },
        }),
      );
      expect(result).toEqual([
        {
          id: '1',
          date: dbMatches[0].date,
          championship: 'World Cup',
          team1: 'Brasil',
          team2: 'Alemanha',
          status: 'NS',
          team1Score: undefined,
          team2Score: undefined,
          externalId: '100',
        },
      ]);
    });

    it('should return empty array when no matches', async () => {
      prisma.footballMatch.findMany.mockResolvedValue([]);
      const result = await service.getTodayMatches();
      expect(result).toEqual([]);
    });
  });

  describe('getMatchesByCompetition', () => {
    it('should filter matches by competition name', async () => {
      prisma.footballMatch.findMany.mockResolvedValue([
        {
          id: '2',
          date: new Date(),
          championship: 'World Cup',
          homeTeam: 'France',
          awayTeam: 'Spain',
          status: 'FT',
          homeScore: 2,
          awayScore: 1,
          externalId: '200',
        },
      ]);

      const result = await service.getMatchesByCompetition('World Cup');

      expect(prisma.footballMatch.findMany).toHaveBeenCalledWith({
        where: { championship: { contains: 'World Cup', mode: 'insensitive' } },
        orderBy: { date: 'asc' },
      });
      expect(result[0].team1).toBe('França');
      expect(result[0].team2).toBe('Espanha');
      expect(result[0].team1Score).toBe(2);
      expect(result[0].team2Score).toBe(1);
    });
  });

  describe('getStandings', () => {
    it('should delegate to footballApiService', async () => {
      const standings = [{ group: 'A', table: [] }];
      footballApi.getStandings!.mockResolvedValue(standings);

      const result = await service.getStandings();
      expect(result).toEqual(standings);
    });
  });

  describe('getTopScorers', () => {
    it('should delegate to footballApiService', async () => {
      const scorers = [{ playerName: 'Messi', goals: 5 }];
      footballApi.getTopScorers!.mockResolvedValue(scorers);

      const result = await service.getTopScorers();
      expect(result).toEqual(scorers);
    });
  });
});
