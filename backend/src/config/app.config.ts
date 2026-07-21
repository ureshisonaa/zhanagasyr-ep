import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  apiPrefix: string;
  corsOrigin: string;
  nodeEnv: string;
  /** Опционален — если не задан, error tracking отключён, приложение работает как обычно (Этап 12.1). */
  sentryDsn?: string;
}

export default registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env.PORT ?? '4000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    nodeEnv: process.env.NODE_ENV ?? 'development',
    sentryDsn: process.env.SENTRY_DSN,
  }),
);
