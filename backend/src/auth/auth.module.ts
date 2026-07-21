import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

/**
 * JwtModule.register({}) без секрета/expiresIn по умолчанию: access и
 * refresh токены используют РАЗНЫЕ секреты и время жизни, которые
 * AuthService передаёт явно при каждом sign()/verify() — единый общий
 * секрет для обоих типов токенов был бы архитектурно слабее.
 *
 * JwtAccessGuard регистрируется здесь как APP_GUARD (глобально для всего
 * приложения), а не в AppModule — так модуль Auth остаётся самодостаточным:
 * любой, кто импортирует AuthModule, автоматически получает secure-by-default.
 */
@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    RolesGuard,
    { provide: APP_GUARD, useClass: JwtAccessGuard },
  ],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {}
