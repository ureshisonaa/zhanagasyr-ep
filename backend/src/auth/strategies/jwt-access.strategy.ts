import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import type { JwtConfig } from '../../config/jwt.config';
import { PrismaService } from '../../prisma/prisma.service';
import type { AccessTokenPayload } from '../interfaces/jwt-payload.interface';
import type { SanitizedUser } from '../interfaces/sanitized-user.interface';
import { toSanitizedUser } from '../utils/sanitize-user.util';

function extractAccessTokenFromCookie(req: Request): string | null {
  const token = req?.cookies?.['access_token'] as string | undefined;
  return token ?? null;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  public constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtConfig = configService.get<JwtConfig>('jwt');

    if (!jwtConfig) {
      throw new Error('JWT configuration is not loaded');
    }

    super({
      jwtFromRequest: extractAccessTokenFromCookie,
      ignoreExpiration: false,
      secretOrKey: jwtConfig.accessSecret,
    });
  }

  /**
   * Проверяет пользователя по БД на каждый защищённый запрос (а не только
   * подпись токена) — если Admin деактивирует аккаунт (isActive=false),
   * доступ прекращается немедленно, не дожидаясь истечения access-токена.
   */
  public async validate(payload: AccessTokenPayload): Promise<SanitizedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return toSanitizedUser(user);
  }
}
