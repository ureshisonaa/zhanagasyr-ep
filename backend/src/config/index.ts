import appConfig from './app.config';
import databaseConfig from './database.config';
import googleDriveConfig from './google-drive.config';
import jwtConfig from './jwt.config';
import openaiConfig from './openai.config';
import qdrantConfig from './qdrant.config';
import throttleConfig from './throttle.config';

/**
 * Единый список загрузчиков конфигурации для ConfigModule.forRoot({ load }).
 * Добавление новой интеграции (например, будущий Telegram/WhatsApp сервис
 * уведомлений) — это один новый файл `*.config.ts` и одна строка здесь,
 * без изменений в AppModule.
 */
export const configs = [
  appConfig,
  databaseConfig,
  jwtConfig,
  openaiConfig,
  googleDriveConfig,
  qdrantConfig,
  throttleConfig,
];

export { validateEnv } from './env.validation';
