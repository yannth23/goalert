import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;
  let prisma: Record<string, any>;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      favoriteTeam: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      userPreference: {
        upsert: jest.fn(),
      },
    };
    service = new UserService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('should create a user with hashed password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');
      const created = { id: '1', email: 'a@b.com', name: 'A', createdAt: new Date() };
      prisma.user.create.mockResolvedValue(created);

      const result = await service.create('a@b.com', 'pass', 'A');

      expect(bcrypt.hash).toHaveBeenCalledWith('pass', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'a@b.com',
          password: 'hashed-pw',
          name: 'A',
          preferences: { create: { receiveDailyNotifications: true } },
        },
        select: { id: true, email: true, name: true, createdAt: true },
      });
      expect(result).toEqual(created);
    });

    it('should throw ConflictException if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1' });

      await expect(service.create('a@b.com', 'pass')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all users with selected fields', async () => {
      const users = [{ id: '1', email: 'a@b.com', name: 'A', createdAt: new Date() }];
      prisma.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: { id: true, email: true, name: true, createdAt: true },
      });
    });
  });

  describe('findById', () => {
    it('should return user with favorite teams and preferences', async () => {
      const user = { id: '1', favoriteTeams: [], preferences: {} };
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findById('1');
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should query by email with preferences included', async () => {
      const user = { id: '1', email: 'a@b.com', preferences: {} };
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findByEmail('a@b.com');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'a@b.com' },
        include: { preferences: true },
      });
      expect(result).toEqual(user);
    });
  });

  describe('addFavoriteTeam', () => {
    it('should create a favorite team record', async () => {
      prisma.favoriteTeam.create.mockResolvedValue({ userId: '1', teamName: 'Brasil' });

      const result = await service.addFavoriteTeam('1', 'Brasil');

      expect(prisma.favoriteTeam.create).toHaveBeenCalledWith({
        data: { userId: '1', teamName: 'Brasil' },
      });
      expect(result).toEqual({ userId: '1', teamName: 'Brasil' });
    });
  });

  describe('removeFavoriteTeam', () => {
    it('should delete matching favorite team records', async () => {
      prisma.favoriteTeam.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.removeFavoriteTeam('1', 'Brasil');

      expect(prisma.favoriteTeam.deleteMany).toHaveBeenCalledWith({
        where: { userId: '1', teamName: 'Brasil' },
      });
      expect(result).toEqual({ count: 1 });
    });
  });

  describe('updatePreferences', () => {
    it('should upsert user preferences', async () => {
      const pref = { userId: '1', receiveDailyNotifications: false };
      prisma.userPreference.upsert.mockResolvedValue(pref);

      const result = await service.updatePreferences('1', false);

      expect(prisma.userPreference.upsert).toHaveBeenCalledWith({
        where: { userId: '1' },
        update: { receiveDailyNotifications: false },
        create: { userId: '1', receiveDailyNotifications: false },
      });
      expect(result).toEqual(pref);
    });
  });

  describe('updateTelegram', () => {
    it('should upsert telegram settings', async () => {
      const pref = { userId: '1', telegramChatId: '12345', receiveTelegramNotifications: true };
      prisma.userPreference.upsert.mockResolvedValue(pref);

      const result = await service.updateTelegram('1', '12345', true);

      expect(prisma.userPreference.upsert).toHaveBeenCalledWith({
        where: { userId: '1' },
        update: { telegramChatId: '12345', receiveTelegramNotifications: true },
        create: { userId: '1', telegramChatId: '12345', receiveTelegramNotifications: true },
      });
      expect(result).toEqual(pref);
    });

    it('should handle null telegramChatId', async () => {
      prisma.userPreference.upsert.mockResolvedValue({});

      await service.updateTelegram('1', null, false);

      expect(prisma.userPreference.upsert).toHaveBeenCalledWith({
        where: { userId: '1' },
        update: { telegramChatId: null, receiveTelegramNotifications: false },
        create: { userId: '1', telegramChatId: null, receiveTelegramNotifications: false },
      });
    });
  });
});
