import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, validateSync } from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
  Test = 'test',
}

/**
 * Описывает и валидирует все переменные окружения, необходимые приложению
 * на текущем этапе. Переменные будущих интеграций (OpenAI, Google Drive,
 * Qdrant) намеренно помечены @IsOptional — они появятся в .env и станут
 * обязательными по мере реализации соответствующих модулей (Фазы 4–5),
 * без изменения этого файла (только снятие @IsOptional в нужный момент).
 */
class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(0)
  @Max(65535)
  PORT: number = 4000;

  @IsString()
  @IsNotEmpty()
  API_PREFIX: string = 'api/v1';

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsString()
  @IsOptional()
  OPENAI_API_KEY?: string;

  @IsString()
  @IsOptional()
  OPENAI_MODEL: string = 'gpt-5.5';

  @IsString()
  @IsOptional()
  OPENAI_EMBEDDING_MODEL: string = 'text-embedding-3-small';

  @IsInt()
  @IsOptional()
  OPENAI_TIMEOUT_MS: number = 60000;

  @IsString()
  @IsOptional()
  GOOGLE_DRIVE_CLIENT_EMAIL?: string;

  @IsString()
  @IsOptional()
  GOOGLE_DRIVE_PRIVATE_KEY?: string;

  @IsString()
  @IsOptional()
  GOOGLE_DRIVE_ROOT_FOLDER_ID?: string;

  @IsString()
  @IsOptional()
  QDRANT_URL: string = 'http://localhost:6333';

  @IsString()
  @IsOptional()
  QDRANT_API_KEY?: string;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN: string = 'http://localhost:5173';

  @IsInt()
  @IsOptional()
  THROTTLE_TTL: number = 60000;

  @IsString()
  @IsOptional()
  SENTRY_DSN?: string;

  @IsInt()
  @IsOptional()
  THROTTLE_LIMIT: number = 100;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.toString()}`);
  }

  return validated;
}
