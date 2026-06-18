import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let userService: Partial<Record<keyof UserService, jest.Mock>>;
  let jwtService: Partial<Record<keyof JwtService, jest.Mock>>;

  beforeEach(() => {
    userService = { findByEmail: jest.fn() };
    jwtService = { sign: jest.fn() };
    authService = new AuthService(
      userService as unknown as UserService,
      jwtService as unknown as JwtService,
    );
  });

  describe('login', () => {
    const email = 'test@example.com';
    const password = 'secret123';
    const hashedPassword = '$2b$10$hashed';
    const fakeUser = {
      id: 'user-1',
      email,
      name: 'Test User',
      password: hashedPassword,
    };

    it('should return accessToken and user on valid credentials', async () => {
      userService.findByEmail!.mockResolvedValue(fakeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign!.mockReturnValue('jwt-token');

      const result = await authService.login(email, password);

      expect(userService.findByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'user-1', email });
      expect(result).toEqual({
        accessToken: 'jwt-token',
        user: { id: 'user-1', email, name: 'Test User' },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userService.findByEmail!.mockResolvedValue(null);

      await expect(authService.login(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      userService.findByEmail!.mockResolvedValue(fakeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });
});
