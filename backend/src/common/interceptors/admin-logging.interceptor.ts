import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface';
import { PrismaService } from '../../prisma/prisma.service';

const ADMIN_ROLES = ['Admin', 'SuperAdmin'];
const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Roadmap, Этап 11.5 — "автоматическое логирование всех admin-действий".
 * Регистрируется глобально (AppModule, APP_INTERCEPTOR — нужна DI-инъекция
 * PrismaService, поэтому не через app.useGlobalInterceptors() в main.ts,
 * как LoggingInterceptor, Этап 0.2, у которого таких зависимостей нет).
 *
 * Осознанно НЕ фильтрует по префиксу пути /admin/* — часть действий,
 * доступных только Admin/SuperAdmin (например ручное изменение статуса
 * документа, PUT /documents/:id/status, Этап 10.1; финальный статус
 * заявки, PUT /applications/:id/status, Этап 3.1), живёт вне /admin/*.
 * Условие вместо этого — реальная роль исполнителя (Admin/SuperAdmin) и
 * мутирующий HTTP-метод: это точнее отражает "аудит действий
 * администраторов", а не "аудит запросов к определённым путям".
 *
 * Тело запроса намеренно НЕ логируется — см. комментарий к модели
 * AdminLogEntry в schema.prisma (риск утечки чувствительных данных,
 * например пароля при создании пользователя).
 */
@Injectable()
export class AdminLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AdminLoggingInterceptor.name);

  public constructor(private readonly prisma: PrismaService) {}

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<AuthenticatedRequest>();
    const response = httpContext.getResponse<Response>();

    // request.user типизирован как всегда присутствующий (SanitizedUser),
    // но это верно только для роутов, прошедших JwtAccessGuard — на
    // @Public() роутах (например логин) он реально может быть undefined.
    // Интерсептор глобальный и видит ВСЕ запросы, поэтому проверяем явно,
    // а не доверяем типу вслепую.
    const user = request.user as AuthenticatedRequest['user'] | undefined;
    const isAdminAction = Boolean(user) && ADMIN_ROLES.includes(user?.role ?? '');
    const isMutating = MUTATING_METHODS.includes(request.method);

    if (!isAdminAction || !isMutating) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const adminId = user!.id;
        const { method, originalUrl } = request;
        const { statusCode } = response;

        this.prisma.adminLogEntry
          .create({ data: { adminId, method, path: originalUrl, statusCode } })
          .catch((error: unknown) => {
            // Сбой записи аудита не должен ломать уже выполненное admin-действие.
            this.logger.warn(`Failed to write admin log entry: ${String(error)}`);
          });
      }),
    );
  }
}
