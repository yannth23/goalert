import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(email: string, password: string, name?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');
    const hashed = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: { email, password: hashed, name, preferences: { create: { receiveDailyNotifications: true } } },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({ select: { id: true, email: true, name: true, createdAt: true } });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        favoriteTeams: true,
        preferences: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, include: { preferences: true } });
  }

  async addFavoriteTeam(userId: string, teamName: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.favoriteTeam.create({ data: { userId, teamName } });
  }

  async removeFavoriteTeam(userId: string, teamName: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.favoriteTeam.deleteMany({ where: { userId, teamName } });
  }

  async updatePreferences(userId: string, receiveDailyNotifications: boolean) {
    return this.prisma.userPreference.upsert({
      where:  { userId },
      update: { receiveDailyNotifications },
      create: { userId, receiveDailyNotifications },
    });
  }

  async updateTelegram(userId: string, telegramChatId: string | null, receiveTelegramNotifications: boolean) {
    return this.prisma.userPreference.upsert({
      where:  { userId },
      update: { telegramChatId, receiveTelegramNotifications },
      create: { userId, telegramChatId, receiveTelegramNotifications },
    });
  }
}
