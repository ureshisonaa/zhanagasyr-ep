import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import type { AppConfig } from '../config/app.config';

/**
 * Этап 12.1 — "error tracking" из Roadmap. Опционален по конструкции:
 * без SENTRY_DSN приложение работает как раньше (ошибки только в
 * серверном логе, см. HttpExceptionFilter) — тот же принцип, что и у
 * AiPrompts (Этап 11.3): необязательная настройка не блокирует запуск
 * платформы "из коробки".
 */
@Injectable()
export class ErrorTrackingService {
  private readonly logger = new Logger(ErrorTrackingService.name);
  private readonly isEnabled: boolean;

  public constructor(private readonly configService: ConfigService) {
    const appConfig = this.configService.get<AppConfig>('app');
    this.isEnabled = Boolean(appConfig?.sentryDsn);

    if (this.isEnabled) {
      Sentry.init({
        dsn: appConfig?.sentryDsn,
        environment: appConfig?.nodeEnv,
        // Полная трассировка запросов не нужна — это не APM-профилирование,
        // а именно error tracking; низкий sample rate достаточен для
        // диагностики проблем без лишней нагрузки/затрат.
        tracesSampleRate: 0.1,
      });
      this.logger.log('Sentry error tracking initialized');
    } else {
      this.logger.warn(
        'SENTRY_DSN is not configured — error tracking disabled (errors only logged locally).',
      );
    }
  }

  /** Вызывается HttpExceptionFilter только для 5xx — ожидаемые 4xx (валидация, 403 и т.п.) не засоряют Sentry. */
  public captureException(error: unknown): void {
    if (this.isEnabled) {
      Sentry.captureException(error);
    }
  }
}
