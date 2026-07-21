import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Логирует каждый HTTP-запрос (Часть 3, п.19 ТЗ): метод, endpoint, статус,
 * время ответа, IP, timestamp.
 *
 * User ID пока не логируется — на этом этапе ещё нет Auth/JWT-контекста
 * (появится на Этапе 1.1). Как только Guard будет прикреплять пользователя
 * к запросу, сюда добавляется `request.user?.id` без изменения остальной
 * логики интерцептора.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const startTime = Date.now();
    const { method, originalUrl, ip } = request;

    return next.handle().pipe(
      tap(() => {
        const responseTimeMs = Date.now() - startTime;
        const { statusCode } = response;
        this.logger.log(
          `${method} ${originalUrl} ${statusCode} - ${responseTimeMs}ms - IP: ${ip} - ${new Date().toISOString()}`,
        );
      }),
    );
  }
}
