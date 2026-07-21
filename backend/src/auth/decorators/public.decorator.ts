import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Помечает роут как доступный без аутентификации.
 * Архитектурное решение Этапа 1.1: JwtAccessGuard применяется ГЛОБАЛЬНО
 * (secure-by-default — доступ запрещён, пока явно не разрешено), поэтому
 * любой новый публичный роут в любом будущем модуле обязан быть помечен
 * этим декоратором, иначе вернёт 401.
 */
export const Public = (): ReturnType<typeof SetMetadata> => SetMetadata(IS_PUBLIC_KEY, true);
