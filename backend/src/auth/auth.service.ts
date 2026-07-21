import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { JwtConfig } from '../config/jwt.config';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessTokenPayload, RefreshTokenPayload } from './interfaces/jwt-payload.interface';
import type { SanitizedUser } from './interfaces/sanitized-user.interface';
import type { UserWithRole } from '../common/interfaces/user-with-role.interface';
import { toSanitizedUser } from './utils/sanitize-user.util';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: SanitizedUser;
  tokens: TokenPair;
}

const GENERIC_INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

@Injectable()
export class AuthService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  public async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.validateCredentials(email, password);
    const tokens = await this.generateTokenPair(user);

    return { user: toSanitizedUser(user), tokens };
  }

  /**
   * Вызывается из-под JwtRefreshGuard, поэтому userId уже проверен
   * (пользователь существует, активен, tokenVersion совпадает).
   * Здесь достаточно перевыпустить пару токенов.
   */
  public async refresh(userId: string): Promise<AuthResult> {
    const user = await this.findActiveUserOrThrow(userId);
    const tokens = await this.generateTokenPair(user);

    return { user: toSanitizedUser(user), tokens };
  }

  /**
   * Инкремент tokenVersion мгновенно инвалидирует ВСЕ refresh-токены
   * пользователя (глобальный logout, не только текущей сессии/устройства —
   * осознанное упрощение архитектуры на этом этапе, см. schema.prisma).
   */
  public async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  public async getProfile(userId: string): Promise<SanitizedUser> {
    const user = await this.findActiveUserOrThrow(userId);
    return toSanitizedUser(user);
  }

  /**
   * Перевыпускает пару токенов для текущей сессии без проверки пароля —
   * вызывается ПОСЛЕ уже совершённого чувствительного действия (смена
   * пароля в UsersService), чтобы пользователь, только что сменивший
   * пароль, не был неожиданно разлогинен вместе со всеми остальными
   * (устаревшими/украденными) сессиями, которые инвалидирует смена пароля.
   */
  public async reissueTokens(userId: string): Promise<TokenPair> {
    const user = await this.findActiveUserOrThrow(userId);
    return this.generateTokenPair(user);
  }

  private async validateCredentials(email: string, password: string): Promise<UserWithRole> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    // Намеренно один и тот же generic-текст ошибки и для "нет такого email",
    // и для "неверный пароль" — иначе ответ раскрывает существование email
    // в базе (user enumeration).
    if (!user || !user.isActive) {
      throw new UnauthorizedException(GENERIC_INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException(GENERIC_INVALID_CREDENTIALS_MESSAGE);
    }

    return user;
  }

  private async findActiveUserOrThrow(userId: string): Promise<UserWithRole> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  private async generateTokenPair(user: UserWithRole): Promise<TokenPair> {
    const jwtConfig = this.configService.get<JwtConfig>('jwt');

    if (!jwtConfig) {
      throw new Error('JWT configuration is not loaded');
    }

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tokenVersion: user.tokenVersion,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: jwtConfig.accessSecret,
        expiresIn: jwtConfig.accessExpiresIn,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: jwtConfig.refreshSecret,
        expiresIn: jwtConfig.refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
