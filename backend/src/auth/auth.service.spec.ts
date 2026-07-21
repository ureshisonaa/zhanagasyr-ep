import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import type { PrismaService } from '../prisma/prisma.service';

jest.mock('bcrypt');

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

/**
 * Roadmap, Этап 13.1: unit-тесты критичных сервисов. AuthService выбран
 * не случайно — здесь живёт защита от user enumeration (одинаковое
 * сообщение об ошибке для "нет такого email" и "неверный пароль") и
 * инвалидация сессий через tokenVersion — оба свойства легко сломать
 * незаметно при рефакторинге, если их не покрыть тестами явно.
 */
describe('AuthService', () => {
  let authService: AuthService;
  let prisma: { user: { findUnique: jest.Mock; update: jest.Mock } };
  let jwtService: { signAsync: jest.Mock };
  let configService: { get: jest.Mock };

  const activeUser = {
    id: 'user-1',
    email: 'student@example.com',
    password: 'hashed-password',
    isActive: true,
    tokenVersion: 0,
    firstName: 'Aya',
    lastName: 'N',
    role: { id: 'role-1', name: 'Student' },
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    configService = {
      get: jest.fn().mockReturnValue({
        accessSecret: 'access-secret',
        refreshSecret: 'refresh-secret',
        accessExpiresIn: '15m',
        refreshExpiresIn: '7d',
      }),
    };

    authService = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );

    jest.clearAllMocks();
  });

  describe('login', () => {
    it('возвращает пользователя и пару токенов при верных данных', async () => {
      prisma.user.findUnique.mockResolvedValue(activeUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwtService.signAsync.mockResolvedValue('signed-token');

      const result = await authService.login('student@example.com', 'correct-password');

      expect(result.user.email).toBe('student@example.com');
      expect(result.tokens.accessToken).toBe('signed-token');
      expect(result.tokens.refreshToken).toBe('signed-token');
    });

    it('выбрасывает одинаковую generic-ошибку для несуществующего email (защита от user enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login('ghost@example.com', 'whatever')).rejects.toThrow(
        UnauthorizedException,
      );
      // bcrypt.compare не должен вызываться вовсе — нет пользователя, нечего сравнивать.
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('выбрасывает ТУ ЖЕ generic-ошибку для неверного пароля — не "invalid password"', async () => {
      prisma.user.findUnique.mockResolvedValue(activeUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      let caughtMessage: string | undefined;

      try {
        await authService.login('student@example.com', 'wrong-password');
      } catch (error) {
        caughtMessage = (error as UnauthorizedException).message;
      }

      expect(caughtMessage).toBe('Invalid email or password');
    });

    it('отклоняет деактивированного пользователя даже с верным паролем', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, isActive: false });

      await expect(authService.login('student@example.com', 'correct-password')).rejects.toThrow(
        UnauthorizedException,
      );
      // Проверка isActive происходит ДО сравнения пароля — bcrypt.compare не вызывается.
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('перевыпускает токены для активного пользователя без проверки пароля', async () => {
      prisma.user.findUnique.mockResolvedValue(activeUser);

      const result = await authService.refresh('user-1');

      expect(result.tokens.accessToken).toBe('signed-token');
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('отклоняет несуществующего пользователя', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.refresh('ghost-id')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('инкрементирует tokenVersion — инвалидирует все refresh-токены пользователя', async () => {
      await authService.logout('user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { tokenVersion: { increment: 1 } },
      });
    });
  });

  describe('getProfile', () => {
    it('возвращает санитизированный профиль активного пользователя', async () => {
      prisma.user.findUnique.mockResolvedValue(activeUser);

      const profile = await authService.getProfile('user-1');

      expect(profile.email).toBe('student@example.com');
      // Хэш пароля не должен попадать в санитизированный профиль.
      expect((profile as unknown as { password?: string }).password).toBeUndefined();
    });

    it('отклоняет запрос профиля деактивированного пользователя', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, isActive: false });

      await expect(authService.getProfile('user-1')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('reissueTokens', () => {
    it('выпускает новую пару токенов без проверки пароля (используется после смены пароля)', async () => {
      prisma.user.findUnique.mockResolvedValue(activeUser);

      const tokens = await authService.reissueTokens('user-1');

      expect(tokens.accessToken).toBe('signed-token');
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });
  });
});
