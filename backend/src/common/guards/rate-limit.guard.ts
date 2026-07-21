import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface';

/**
 * Roadmap, Этап 12.1 (Security hardening) — кастомный guard поверх
 * встроенного ThrottlerGuard, используемого @Throttle-декораторами по
 * всему проекту (Auth, AI-чат, AI-рекомендации, загрузка документов).
 *
 * Стандартный ThrottlerGuard трекает лимит по IP-адресу. Для закрытой
 * платформы с обязательной авторизацией это два практических изъяна:
 * 1. Несколько пользователей за одним IP (NAT, офисная/учебная сеть,
 *    мобильный оператор) делят один лимит — легитимный пользователь может
 *    упереться в 429 из-за действий другого человека за тем же IP.
 * 2. Один пользователь может обойти лимит, просто сменив сеть/IP (VPN).
 *
 * Решение — трекать по userId для аутентифицированных запросов (более
 * точная привязка, устойчивая к смене IP), с откатом на IP только для
 * действительно анонимных запросов (@Public()-роуты вроде /auth/login,
 * где userId ещё не существует по определению).
 *
 * Регистрируется глобально вместо обычного ThrottlerGuard (AppModule,
 * APP_GUARD) — все существующие @Throttle-декораторы в проекте начинают
 * использовать эту трекинг-логику автоматически, без изменения самих
 * декораторов на местах их использования.
 */
@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as AuthenticatedRequest;
    return request.user?.id ?? request.ip ?? 'unknown';
  }
}
