import { DailyEmailService } from './daily-email.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { FootballApiService } from '../football-match/football-api.service';
import { TelegramService } from '../telegram/telegram.service';

describe('DailyEmailService', () => {
  let service: DailyEmailService;
  let prisma: Record<string, any>;
  let emailService: Partial<Record<keyof EmailService, jest.Mock>>;
  let footballApi: Partial<Record<keyof FootballApiService, jest.Mock>>;
  let telegram: Partial<Record<keyof TelegramService, jest.Mock>>;

  beforeEach(() => {
    prisma = {
      footballMatch: { findMany: jest.fn() },
      user: { findMany: jest.fn() },
    };
    emailService = { sendDailyEmail: jest.fn() };
    footballApi = { syncTodayMatches: jest.fn() };
    telegram = { sendMessage: jest.fn() };

    service = new DailyEmailService(
      prisma as unknown as PrismaService,
      emailService as unknown as EmailService,
      footballApi as unknown as FootballApiService,
      telegram as unknown as TelegramService,
    );
  });

  describe('onApplicationBootstrap', () => {
    it('should sync matches on bootstrap', async () => {
      footballApi.syncTodayMatches!.mockResolvedValue({ synced: 3 });

      await service.onApplicationBootstrap();

      expect(footballApi.syncTodayMatches).toHaveBeenCalledTimes(1);
    });

    it('should not throw when sync fails', async () => {
      footballApi.syncTodayMatches!.mockRejectedValue(new Error('fail'));

      await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    });
  });

  describe('syncMatches', () => {
    it('should call syncTodayMatches', async () => {
      footballApi.syncTodayMatches!.mockResolvedValue({ synced: 10 });

      await service.syncMatches();

      expect(footballApi.syncTodayMatches).toHaveBeenCalled();
    });

    it('should not throw on failure', async () => {
      footballApi.syncTodayMatches!.mockRejectedValue(new Error('err'));

      await expect(service.syncMatches()).resolves.toBeUndefined();
    });
  });

  describe('syncLiveMatches', () => {
    it('should call syncTodayMatches', async () => {
      footballApi.syncTodayMatches!.mockResolvedValue({ synced: 5 });

      await service.syncLiveMatches();

      expect(footballApi.syncTodayMatches).toHaveBeenCalled();
    });
  });

  describe('runDailyJob', () => {
    it('should send emails to users with matching favorite teams', async () => {
      const matches = [
        {
          homeTeam: 'Brasil',
          awayTeam: 'Alemanha',
          championship: 'World Cup',
          date: new Date('2026-06-18T15:00:00Z'),
          homeScore: null,
          awayScore: null,
          status: 'NS',
        },
      ];
      const users = [
        {
          id: '1',
          email: 'fan@example.com',
          favoriteTeams: [{ teamName: 'Brasil' }],
          preferences: { receiveDailyNotifications: true, receiveTelegramNotifications: false },
        },
      ];

      prisma.footballMatch.findMany.mockResolvedValue(matches);
      prisma.user.findMany.mockResolvedValue(users);
      emailService.sendDailyEmail!.mockResolvedValue(undefined);

      await service.runDailyJob();

      expect(emailService.sendDailyEmail).toHaveBeenCalledTimes(1);
      expect(emailService.sendDailyEmail).toHaveBeenCalledWith(
        'fan@example.com',
        expect.stringContaining('Brasil'),
      );
    });

    it('should send Telegram message when user has telegram enabled', async () => {
      const matches = [
        {
          homeTeam: 'Brasil',
          awayTeam: 'Alemanha',
          championship: 'World Cup',
          date: new Date('2026-06-18T15:00:00Z'),
          homeScore: null,
          awayScore: null,
          status: 'NS',
        },
      ];
      const users = [
        {
          id: '1',
          email: 'fan@example.com',
          favoriteTeams: [{ teamName: 'Brasil' }],
          preferences: {
            receiveDailyNotifications: false,
            receiveTelegramNotifications: true,
            telegramChatId: '12345',
          },
        },
      ];

      prisma.footballMatch.findMany.mockResolvedValue(matches);
      prisma.user.findMany.mockResolvedValue(users);

      await service.runDailyJob();

      expect(telegram.sendMessage).toHaveBeenCalledTimes(1);
      expect(telegram.sendMessage).toHaveBeenCalledWith('12345', expect.any(String));
      expect(emailService.sendDailyEmail).not.toHaveBeenCalled();
    });

    it('should skip users with no matching favorite teams', async () => {
      const matches = [
        {
          homeTeam: 'Brasil',
          awayTeam: 'Alemanha',
          championship: 'WC',
          date: new Date(),
          homeScore: null,
          awayScore: null,
          status: 'NS',
        },
      ];
      const users = [
        {
          id: '1',
          email: 'fan@example.com',
          favoriteTeams: [{ teamName: 'France' }],
          preferences: { receiveDailyNotifications: true },
        },
      ];

      prisma.footballMatch.findMany.mockResolvedValue(matches);
      prisma.user.findMany.mockResolvedValue(users);

      await service.runDailyJob();

      expect(emailService.sendDailyEmail).not.toHaveBeenCalled();
    });

    it('should handle email send failure gracefully', async () => {
      const matches = [
        {
          homeTeam: 'Brasil',
          awayTeam: 'Alemanha',
          championship: 'WC',
          date: new Date(),
          homeScore: null,
          awayScore: null,
          status: 'NS',
        },
      ];
      const users = [
        {
          id: '1',
          email: 'fail@example.com',
          favoriteTeams: [{ teamName: 'Brasil' }],
          preferences: { receiveDailyNotifications: true, receiveTelegramNotifications: false },
        },
      ];

      prisma.footballMatch.findMany.mockResolvedValue(matches);
      prisma.user.findMany.mockResolvedValue(users);
      emailService.sendDailyEmail!.mockRejectedValue(new Error('send failed'));

      await expect(service.runDailyJob()).resolves.toBeUndefined();
    });
  });
});
