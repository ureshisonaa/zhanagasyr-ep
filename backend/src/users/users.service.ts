import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { hashPassword } from '../common/utils/password.util';
import type { UserWithRole } from '../common/interfaces/user-with-role.interface';
import { PrismaService } from '../prisma/prisma.service';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import type { FullProfile } from './interfaces/full-profile.interface';
import type { UserSettingsResponse } from './interfaces/user-settings-response.interface';
import { AVATAR_PUBLIC_PATH_PREFIX, AVATAR_UPLOAD_DIR } from './multer/avatar-storage.config';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  public constructor(private readonly prisma: PrismaService) {}

  /**
   * Не переиспользует SanitizedUser из Auth намеренно — это другой,
   * более полный срез данных (Settings), а не то, что нужно для проверки
   * сессии.
   */
  public async getFullProfile(userId: string): Promise<FullProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.toFullProfile(user);
  }

  public async updateProfile(userId: string, dto: UpdateProfileDto): Promise<FullProfile> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          country: dto.country,
          city: dto.city,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        },
        include: { role: true },
      });

      return this.toFullProfile(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Phone number is already in use');
      }
      throw error;
    }
  }

  public async updateAvatar(userId: string, avatarPublicPath: string): Promise<FullProfile> {
    const previousUser = await this.prisma.user.findUnique({ where: { id: userId } });

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarPublicPath },
      include: { role: true },
    });

    if (previousUser?.avatar?.startsWith(AVATAR_PUBLIC_PATH_PREFIX)) {
      await this.tryDeleteOldAvatarFile(previousUser.avatar);
    }

    return this.toFullProfile(user);
  }

  /**
   * После успешной смены пароля инкрементирует tokenVersion — это
   * инвалидирует все refresh-токены (в т.ч. потенциально украденные).
   * Реиссью токена для ТЕКУЩЕЙ сессии выполняет AuthService.reissueTokens
   * из UsersController — сама смена пароля этим не занимается (разделение
   * ответственности: пароль — здесь, токены — в Auth).
   */
  public async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const currentPasswordMatches = await bcrypt.compare(dto.currentPassword, user.password);

    if (!currentPasswordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordSameAsOld = await bcrypt.compare(dto.newPassword, user.password);

    if (newPasswordSameAsOld) {
      throw new ConflictException('New password must be different from the current one');
    }

    const newPasswordHash = await hashPassword(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newPasswordHash, tokenVersion: { increment: 1 } },
    });
  }

  /**
   * GET всегда гарантирует существование строки (upsert с пустым update) —
   * первый визит на страницу настроек не должен требовать отдельного шага
   * "создать настройки", пользователь сразу видит дефолты.
   */
  public async getSettings(userId: string): Promise<UserSettingsResponse> {
    const settings = await this.prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    return this.toUserSettingsResponse(settings);
  }

  public async updateSettings(
    userId: string,
    dto: UpdateUserSettingsDto,
  ): Promise<UserSettingsResponse> {
    const settings = await this.prisma.userSettings.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });

    return this.toUserSettingsResponse(settings);
  }

  private toUserSettingsResponse(settings: {
    theme: string;
    language: string;
    timezone: string;
    notificationsEmail: boolean;
  }): UserSettingsResponse {
    return {
      theme: settings.theme,
      language: settings.language,
      timezone: settings.timezone,
      notificationsEmail: settings.notificationsEmail,
    };
  }

  private toFullProfile(user: UserWithRole): FullProfile {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      country: user.country,
      city: user.city,
      birthDate: user.birthDate ? user.birthDate.toISOString() : null,
      avatar: user.avatar,
      role: user.role.name,
      isActive: user.isActive,
    };
  }

  private async tryDeleteOldAvatarFile(avatarPublicPath: string): Promise<void> {
    try {
      const filename = avatarPublicPath.replace(`${AVATAR_PUBLIC_PATH_PREFIX}/`, '');
      await unlink(join(AVATAR_UPLOAD_DIR, filename));
    } catch (error) {
      // Некритично: старый файл мог быть уже удалён или отсутствовать —
      // не должно ломать обновление аватара.
      this.logger.warn(`Failed to delete old avatar file "${avatarPublicPath}": ${String(error)}`);
    }
  }
}
