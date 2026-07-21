import type { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/app.config';
import type { JwtConfig } from '../../config/jwt.config';

export function getAppAndJwtConfigOrThrow(configService: ConfigService): {
  appConfig: AppConfig;
  jwtConfig: JwtConfig;
} {
  const appConfig = configService.get<AppConfig>('app');
  const jwtConfig = configService.get<JwtConfig>('jwt');

  if (!appConfig || !jwtConfig) {
    throw new Error('App or JWT configuration is not loaded');
  }

  return { appConfig, jwtConfig };
}
