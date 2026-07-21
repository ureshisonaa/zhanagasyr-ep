import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import type { JwtConfig } from '../../config/jwt.config';
import { PrismaService } from '../../prisma/prisma.service';
import type { RefreshTokenPayload } from '../interfaces/jwt-payload.interface';
import type { SanitizedUser } from '../interfaces/sanitized-user.interface';
import { toSanitizedUser } from '../utils/sanitize-user.util';

function extractRefreshTokenFromCookie(req: Request): string | null {
  const token = req?.cookies?.['refresh_token'] as string | undefined;
  return token ?? null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  public constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtConfig = configService.get<JwtConfig>('jwt');

    if (!jwtConfig) {
      throw new Error('JWT configuration is not loaded');
    }

    super({
      jwtFromRequest: extractRefreshTokenFromCookie,
      ignoreExpiration: false,
      secretOrKey: jwtConfig.refreshSecret,
    });
  }

  /**
   * tokenVersion в токене должен совпадать с текущим User.tokenVersion —
   * это единственный механизм отзыва refresh-токена до logout
   * (см. AuthService.logout).
   */
  public async validate(payload: RefreshTokenPayload): Promise<SanitizedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    return toSanitizedUser(user);
  }
}
