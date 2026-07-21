import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import type { SanitizedUser } from './interfaces/sanitized-user.interface';
import { clearAuthCookies, setAuthCookies } from './utils/cookie.util';
import { getAppAndJwtConfigOrThrow } from './utils/config.util';

interface AuthSuccessResponse {
  success: true;
  user: SanitizedUser;
}

@Controller('auth')
export class AuthController {
  public constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  public async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSuccessResponse> {
    const { user, tokens } = await this.authService.login(dto.email, dto.password);
    const { appConfig, jwtConfig } = getAppAndJwtConfigOrThrow(this.configService);
    setAuthCookies(response, tokens, jwtConfig, appConfig);

    return { success: true, user };
  }

  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  public async logout(
    @CurrentUser() user: SanitizedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ success: true }> {
    await this.authService.logout(user.id);
    const { appConfig } = getAppAndJwtConfigOrThrow(this.configService);
    clearAuthCookies(response, appConfig);

    return { success: true };
  }

  /**
   * @Public() снимает только глобальный JwtAccessGuard — реальную проверку
   * refresh-токена по-прежнему выполняет локально прикреплённый
   * JwtRefreshGuard.
   */
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  public async refresh(
    @CurrentUser() user: SanitizedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSuccessResponse> {
    const { user: refreshedUser, tokens } = await this.authService.refresh(user.id);
    const { appConfig, jwtConfig } = getAppAndJwtConfigOrThrow(this.configService);
    setAuthCookies(response, tokens, jwtConfig, appConfig);

    return { success: true, user: refreshedUser };
  }

  @UseGuards(JwtAccessGuard)
  @Get('me')
  public getMe(@CurrentUser() user: SanitizedUser): AuthSuccessResponse {
    return { success: true, user };
  }
}
