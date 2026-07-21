import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { setAuthCookies } from '../auth/utils/cookie.util';
import { getAppAndJwtConfigOrThrow } from '../auth/utils/config.util';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import type { FullProfile } from './interfaces/full-profile.interface';
import type { UserSettingsResponse } from './interfaces/user-settings-response.interface';
import { AVATAR_PUBLIC_PATH_PREFIX, avatarMulterOptions } from './multer/avatar-storage.config';
import { UsersService } from './users.service';

interface ProfileResponse {
  success: true;
  profile: FullProfile;
}

/**
 * Namespaced под /users — глобальный JwtAccessGuard (Auth, Этап 1.1) уже
 * требует аутентификации по умолчанию, дополнительный @UseGuards тут не
 * нужен. RBAC (@Roles/RolesGuard) здесь тоже не нужен: все роуты —
 * self-service (пользователь управляет только своим профилем), а не
 * межпользовательские admin-операции (те появятся в Admin Panel, Фаза 11).
 */
@Controller('users')
export class UsersController {
  public constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Не GET /users/me — такой роут уже есть в Auth (сессионная проверка).
   * Это отдельный, более полный срез профиля для страницы Settings.
   */
  @Get('profile')
  public async getProfile(@CurrentUser() user: SanitizedUser): Promise<ProfileResponse> {
    const profile = await this.usersService.getFullProfile(user.id);
    return { success: true, profile };
  }

  @Put('profile')
  public async updateProfile(
    @CurrentUser() user: SanitizedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    const profile = await this.usersService.updateProfile(user.id, dto);
    return { success: true, profile };
  }

  @Put('avatar')
  @UseInterceptors(FileInterceptor('avatar', avatarMulterOptions))
  public async updateAvatar(
    @CurrentUser() user: SanitizedUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<ProfileResponse> {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }

    const avatarPublicPath = `${AVATAR_PUBLIC_PATH_PREFIX}/${file.filename}`;
    const profile = await this.usersService.updateAvatar(user.id, avatarPublicPath);

    return { success: true, profile };
  }

  /**
   * После смены пароля перевыпускает токены для ТЕКУЩЕЙ сессии — иначе
   * пользователь, только что сменивший пароль, был бы тут же разлогинен
   * вместе со всеми остальными сессиями (см. UsersService.changePassword).
   */
  @Put('password')
  @HttpCode(HttpStatus.OK)
  public async changePassword(
    @CurrentUser() user: SanitizedUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ success: true }> {
    await this.usersService.changePassword(user.id, dto);

    const tokens = await this.authService.reissueTokens(user.id);
    const { appConfig, jwtConfig } = getAppAndJwtConfigOrThrow(this.configService);
    setAuthCookies(response, tokens, jwtConfig, appConfig);

    return { success: true };
  }

  /** Часть 2, п.16 ТЗ ("Настройки пользователя") — self-service, каждый управляет только своими (Этап 11.3). */
  @Get('settings')
  public async getSettings(
    @CurrentUser() user: SanitizedUser,
  ): Promise<{ success: true; settings: UserSettingsResponse }> {
    const settings = await this.usersService.getSettings(user.id);
    return { success: true, settings };
  }

  @Put('settings')
  public async updateSettings(
    @CurrentUser() user: SanitizedUser,
    @Body() dto: UpdateUserSettingsDto,
  ): Promise<{ success: true; settings: UserSettingsResponse }> {
    const settings = await this.usersService.updateSettings(user.id, dto);
    return { success: true, settings };
  }
}
