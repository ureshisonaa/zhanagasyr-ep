import { RequestMethod, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { GoogleDriveService } from '../../src/google-drive/google-drive.service';
import { OpenAiService } from '../../src/openai/openai.service';

export interface TestAppOverrides {
  googleDriveService?: Partial<GoogleDriveService>;
  openAiService?: Partial<OpenAiService>;
}

/**
 * Поднимает РЕАЛЬНОЕ приложение (реальные guards/pipes/interceptors,
 * реальная БД через Prisma) — в этом смысл e2e (Roadmap, Этап 13.2:
 * "сквозные сценарии через реальный API"), в отличие от unit-тестов
 * (Этап 13.1), где всё замокано.
 *
 * Единственное, что подменяется — GoogleDriveService/OpenAiService, если
 * переданы overrides: реальные вызовы этих сервисов требуют платных
 * внешних credentials (Google Service Account, OpenAI API key) и делают
 * тесты медленными/дорогими/недетерминированными — стандартная практика
 * для e2e с платными внешними API, а не ослабление теста: вся остальная
 * цепочка (HTTP, валидация, БД, бизнес-логика) остаётся настоящей.
 *
 * Требует настроенной тестовой базы данных (переменная DATABASE_URL) —
 * см. README, раздел "Тестирование".
 */
export async function createTestApp(overrides: TestAppOverrides = {}): Promise<INestApplication> {
  const moduleBuilder = Test.createTestingModule({ imports: [AppModule] });

  if (overrides.googleDriveService) {
    moduleBuilder.overrideProvider(GoogleDriveService).useValue(overrides.googleDriveService);
  }

  if (overrides.openAiService) {
    moduleBuilder.overrideProvider(OpenAiService).useValue(overrides.openAiService);
  }

  const moduleFixture = await moduleBuilder.compile();
  const app = moduleFixture.createNestApplication();

  // Повторяет существенную для тестов часть настройки main.ts (Этап 0.2,
  // 12.1) — без этого запросы к /api/v1/... возвращали бы 404, а DTO не
  // валидировались бы как в реальном приложении.
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.setGlobalPrefix('api/v1', { exclude: [{ path: 'health', method: RequestMethod.GET }] });

  await app.init();
  return app;
}
