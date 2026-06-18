import axios from 'axios';
import { FootballApiService } from './football-api.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TelegramService } from '../telegram/telegram.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FootballApiService', () => {
  let service: FootballApiService;
  let prisma: Record<string, any>;
  let redis: Partial<Record<keyof RedisService, jest.Mock>>;
  let telegram: Partial<Record<keyof TelegramService, jest.Mock>>;

  beforeEach(() => {
    prisma = {
      footballMatch: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };
    redis = {
      getJson: jest.fn(),
      setJson: jest.fn(),
      del: jest.fn(),
    };
    telegram = {
      sendMessage: jest.fn(),
    };
    process.env.FOOTBALL_DATA_API_KEY = 'test-api-key';
    service = new FootballApiService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
      telegram as unknown as TelegramService,
    );
  });

  afterEach(() => {
    delete process.env.FOOTBALL_DATA_API_KEY;
    jest.resetAllMocks();
  });

  describe('syncTodayMatches', () => {
    it('should fetch, upsert matches and invalidate cache', async () => {
      const matchData = {
        data: {
          matches: [
            {
              id: 1001,
              status: 'SCHEDULED',
              utcDate: '2026-06-18T15:00:00Z',
              competition: { name: 'World Cup' },
              homeTeam: { name: 'Brazil' },
              awayTeam: { name: 'Germany' },
              score: { fullTime: { home: null, away: null } },
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValueOnce(matchData);
      prisma.footballMatch.findUnique.mockResolvedValue(null);
      prisma.footballMatch.upsert.mockResolvedValue({
        id: '1',
        status: 'NS',
        homeScore: null,
        awayScore: null,
        championship: 'World Cup',
      });
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.syncTodayMatches();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/matches'),
        expect.objectContaining({ params: expect.any(Object) }),
      );
      expect(prisma.footballMatch.upsert).toHaveBeenCalledTimes(1);
      expect(redis.del).toHaveBeenCalled();
      expect(result).toEqual({ synced: 1 });
    });

    it('should map API statuses correctly', async () => {
      const statuses = [
        { api: 'FINISHED', expected: 'FT' },
        { api: 'IN_PLAY', expected: '1H' },
        { api: 'PAUSED', expected: 'HT' },
        { api: 'POSTPONED', expected: 'PST' },
      ];

      for (const { api, expected } of statuses) {
        mockedAxios.get.mockResolvedValueOnce({
          data: {
            matches: [
              {
                id: 2000,
                status: api,
                utcDate: '2026-06-18T15:00:00Z',
                competition: { name: 'WC' },
                homeTeam: { name: 'A' },
                awayTeam: { name: 'B' },
                score: { fullTime: { home: 1, away: 0 } },
              },
            ],
          },
        });
        prisma.footballMatch.findUnique.mockResolvedValue(null);
        prisma.footballMatch.upsert.mockResolvedValue({ status: expected });
        prisma.user.findMany.mockResolvedValue([]);

        await service.syncTodayMatches();

        expect(prisma.footballMatch.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            create: expect.objectContaining({ status: expected }),
          }),
        );
      }
    });
  });

  describe('getStandings', () => {
    it('should return cached standings when available', async () => {
      const cached = [{ group: 'A', table: [] }];
      redis.getJson!.mockResolvedValue(cached);

      const result = await service.getStandings();

      expect(result).toEqual(cached);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should fetch from API and cache when not cached', async () => {
      redis.getJson!.mockResolvedValue(null);
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          standings: [
            {
              group: 'A',
              table: [
                {
                  position: 1,
                  team: { id: 1, name: 'Brazil', crest: 'url' },
                  points: 9,
                  playedGames: 3,
                  won: 3,
                  draw: 0,
                  lost: 0,
                  goalsFor: 7,
                  goalsAgainst: 1,
                  goalDifference: 6,
                },
              ],
            },
          ],
        },
      });

      const result = await service.getStandings();

      expect(result).toEqual([
        {
          group: 'A',
          table: [
            {
              position: 1,
              teamId: 1,
              teamName: 'Brasil',
              crest: 'url',
              points: 9,
              played: 3,
              wins: 3,
              draws: 0,
              losses: 0,
              goalsFor: 7,
              goalsAgainst: 1,
              goalDifference: 6,
            },
          ],
        },
      ]);
      expect(redis.setJson).toHaveBeenCalledWith('standings:wc', expect.any(Array), 300);
    });
  });

  describe('getTopScorers', () => {
    it('should return cached scorers when available', async () => {
      const cached = [{ playerName: 'Messi', goals: 5 }];
      redis.getJson!.mockResolvedValue(cached);

      const result = await service.getTopScorers();

      expect(result).toEqual(cached);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should fetch from API and cache when not cached', async () => {
      redis.getJson!.mockResolvedValue(null);
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          scorers: [
            {
              player: { id: 10, name: 'Messi' },
              team: { name: 'Argentina' },
              goals: 5,
              assists: 2,
            },
          ],
        },
      });

      const result = await service.getTopScorers();

      expect(result).toEqual([
        {
          playerId: 10,
          playerName: 'Messi',
          teamName: 'Argentina',
          goals: 5,
          assists: 2,
        },
      ]);
      expect(redis.setJson).toHaveBeenCalledWith('scorers:wc:top10', expect.any(Array), 300);
    });

    it('should handle missing team name in scorer data', async () => {
      redis.getJson!.mockResolvedValue(null);
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          scorers: [
            {
              player: { id: 20, name: 'Unknown' },
              team: null,
              goals: 1,
              assists: 0,
            },
          ],
        },
      });

      const result = await service.getTopScorers();
      expect(result[0].teamName).toBe('—');
    });
  });
});
