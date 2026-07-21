import type { CookieOptions, Response } from 'express';
import type { AppConfig } from '../../config/app.config';
import type { JwtConfig } from '../../config/jwt.config';
import type { TokenPair } from '../auth.service';

const DURATION_UNIT_TO_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * Простой парсер длительностей вида "15m"/"7d" в миллисекунды.
 * Осознанно не тянем библиотеку вроде `ms` ради одной функции на 10 строк (KISS).
 */
export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration);

  if (!match) {
    throw new Error(`Invalid duration format: "${duration}". Expected e.g. "15m", "7d".`);
  }

  const value = Number(match[1]);
  const unit = match[2];

  return value * DURATION_UNIT_TO_MS[unit];
}

/**
 * Опции cookie зависят от окружения (Часть 3 ТЗ, безопасность):
 * в production frontend (Vercel) и backend (Railway) находятся на разных
 * доменах, поэтому cookie должна быть SameSite=None + Secure, иначе браузер
 * не пришлёт её при кросс-доменном запросе. В локальной разработке
 * (совпадающий origin/порт через прокси) достаточно SameSite=Lax без Secure.
 *
 * Названо isProduction, но означает "развёрнуто на кросс-доменной HTTPS-
 * инфраструктуре" — staging (Этап 14.1) разворачивается на той же схеме
 * Vercel+Railway, что и production, и нуждается в тех же secure-настройках
 * cookie; только development/test используют локальный insecure-режим.
 */
function isProduction(appConfig: AppConfig): boolean {
  return appConfig.nodeEnv === 'production' || appConfig.nodeEnv === 'staging';
}

export function buildAccessTokenCookieOptions(
  jwtConfig: JwtConfig,
  appConfig: AppConfig,
): CookieOptions {
  const production = isProduction(appConfig);

  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    maxAge: parseDurationToMs(jwtConfig.accessExpiresIn),
    path: '/',
  };
}

/**
 * Refresh-cookie намеренно ограничена по path только эндпоинтом /auth/refresh —
 * это сокращает поверхность атаки: refresh-токен физически не отправляется
 * браузером ни на один другой роут API.
 */
export function buildRefreshTokenCookieOptions(
  jwtConfig: JwtConfig,
  appConfig: AppConfig,
): CookieOptions {
  const production = isProduction(appConfig);

  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    maxAge: parseDurationToMs(jwtConfig.refreshExpiresIn),
    path: `/${appConfig.apiPrefix}/auth/refresh`,
  };
}

export function buildClearCookieOptions(
  appConfig: AppConfig,
): { access: CookieOptions; refresh: CookieOptions } {
  const production = isProduction(appConfig);
  const base: CookieOptions = {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
  };

  return {
    access: { ...base, path: '/' },
    refresh: { ...base, path: `/${appConfig.apiPrefix}/auth/refresh` },
  };
}

/**
 * Общая точка установки обеих auth-cookie — используется и AuthController
 * (login/refresh), и UsersController (перевыпуск токенов после смены
 * пароля), чтобы не дублировать одинаковые вызовы response.cookie(...).
 */
export function setAuthCookies(
  response: Response,
  tokens: TokenPair,
  jwtConfig: JwtConfig,
  appConfig: AppConfig,
): void {
  response.cookie('access_token', tokens.accessToken, buildAccessTokenCookieOptions(jwtConfig, appConfig));
  response.cookie(
    'refresh_token',
    tokens.refreshToken,
    buildRefreshTokenCookieOptions(jwtConfig, appConfig),
  );
}

export function clearAuthCookies(response: Response, appConfig: AppConfig): void {
  const clearOptions = buildClearCookieOptions(appConfig);
  response.clearCookie('access_token', clearOptions.access);
  response.clearCookie('refresh_token', clearOptions.refresh);
}
