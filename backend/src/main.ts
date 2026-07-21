import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import type { AppConfig } from './config/app.config';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// Лимит тела JSON/urlencoded запроса (Этап 12.1) — с запасом относительно
// самого крупного DTO в проекте (KnowledgeBase.content, до 50 000 символов).
// Файлы (документы/аватары) идут через Multer отдельным путём и не
// затронуты этим лимитом (multipart/form-data, не JSON).
const REQUEST_BODY_SIZE_LIMIT = '2mb';

/**
 * Точка входа приложения. Ядро (Этап 0.2): Helmet, CORS, глобальная
 * валидация DTO, единый формат ошибок, логирование запросов.
 * Этап 1.1 добавляет cookie-parser — Auth хранит JWT в httpOnly cookie.
 * Этап 12.1 (production hardening): compression, явный лимит размера тела
 * запроса, graceful shutdown, HttpExceptionFilter переехал на DI-регистрацию
 * через APP_FILTER (AppModule) — иначе не смог бы получить ErrorTrackingService.
 *
 * Rate Limiting настроен в AppModule/AuthModule (ThrottlerModule +
 * @Throttle на отдельных чувствительных/дорогих эндпоинтах) — не в
 * main.ts, так как лимиты специфичны для конкретных эндпоинтов
 * (Часть 1, п.13 ТЗ), а не общие для всего API.
 *
 * CSRF: JWT хранится в httpOnly cookie с SameSite=None в production (нужно
 * для cross-origin между Vercel-frontend и Railway-backend, Этап 1.1) —
 * это ослабляет встроенную браузерную защиту SameSite, но митигируется
 * строгим CORS (конкретный corsOrigin, не wildcard, + credentials: true):
 * браузер блокирует state-changing запросы (POST/PUT/DELETE) с других
 * origin ещё на этапе preflight, до того как запрос с cookie дойдёт до
 * сервера. Отдельный CSRF-токен намеренно не добавлен — он был бы
 * избыточен поверх уже действующей защиты и потребовал бы отдельной
 * инфраструктуры на фронтенде ради дублирующей гарантии.
 */
async function bootstrap(): Promise<void> {
  // bodyParser: false — отключаем встроенный парсер Nest, чтобы задать
  // собственный явный лимит размера тела (иначе используется дефолт
  // Express, который нигде в проекте explicitly не документирован).
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const configService = app.get<ConfigService>(ConfigService);
  const appConfig = configService.get<AppConfig>('app');

  if (!appConfig) {
    throw new Error('App configuration is not loaded');
  }

  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: REQUEST_BODY_SIZE_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_SIZE_LIMIT }));
  app.use(cookieParser());
  app.enableCors({ origin: appConfig.corsOrigin, credentials: true });

  // Статика (аватары и т.п.) отдаётся напрямую через Express middleware,
  // вне системы роутинга Nest — поэтому setGlobalPrefix её не затрагивает
  // и exclude здесь не нужен (в отличие от /health).
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // health-check исключён из префикса, чтобы инфраструктурные системы
  // мониторинга (Railway и т.п.) могли проверять его по простому пути /health
  app.setGlobalPrefix(appConfig.apiPrefix, {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Активирует onModuleDestroy-хуки (например PrismaService — закрытие
  // соединения с БД) при получении SIGTERM/SIGINT. Без этого вызова Nest
  // НЕ вызывает эти хуки при штатной остановке процесса (например, когда
  // Railway заменяет старый контейнер новым при деплое) — соединения с БД
  // обрывались бы резко, а не закрывались явно.
  app.enableShutdownHooks();

  await app.listen(appConfig.port);
}

void bootstrap();
