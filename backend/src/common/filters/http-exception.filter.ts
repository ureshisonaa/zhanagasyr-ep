import { ArgumentsHost, Catch, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorTrackingService } from '../../error-tracking/error-tracking.service';

interface ErrorResponseBody {
  success: false;
  message: string;
  statusCode: number;
}

/**
 * Глобальный обработчик ошибок (Часть 3, п.20 ТЗ).
 * Гарантирует единый формат ответа при любой ошибке и никогда не отдаёт
 * стектрейс пользователю — стектрейс попадает только в серверный лог
 * и (с Этапа 12.1, для 5xx) в Sentry, если настроен.
 *
 * @Injectable() + регистрация через APP_FILTER (AppModule), а не
 * `new HttpExceptionFilter()` в main.ts (как было до Этапа 12.1) — иначе
 * DI не смог бы внедрить ErrorTrackingService в конструктор.
 */
@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  public constructor(private readonly errorTrackingService: ErrorTrackingService) {}

  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode = this.resolveStatusCode(exception);
    const message = this.resolveMessage(exception);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`${request.method} ${request.url} - ${message}`, stack);
      this.errorTrackingService.captureException(exception);
    }

    const body: ErrorResponseBody = { success: false, message, statusCode };
    response.status(statusCode).json(body);
  }

  private resolveStatusCode(exception: unknown): number {
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveMessage(exception: unknown): string {
    if (!(exception instanceof HttpException)) {
      return 'Internal server error';
    }

    const response = exception.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (typeof response === 'object' && response !== null && 'message' in response) {
      const rawMessage = (response as { message: unknown }).message;
      return Array.isArray(rawMessage) ? rawMessage.join(', ') : String(rawMessage);
    }

    return exception.message;
  }
}
