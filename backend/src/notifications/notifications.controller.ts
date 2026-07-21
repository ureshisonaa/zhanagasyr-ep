import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import type { NotificationResponse } from './interfaces/notification-response.interface';
import { NotificationsService } from './notifications.service';

/**
 * Нет POST — создание уведомлений только внутреннее (NotificationsService.create,
 * вызывается другими backend-сервисами). Ни один роут не публичен —
 * уведомления персональные.
 */
@Controller('notifications')
export class NotificationsController {
  public constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  public async findAll(
    @CurrentUser() user: SanitizedUser,
    @Query() query: QueryNotificationsDto,
  ): Promise<{ success: true } & PaginatedResult<NotificationResponse>> {
    const result = await this.notificationsService.findAllForUser(user.id, query);
    return { success: true, ...result };
  }

  @HttpCode(HttpStatus.OK)
  @Put(':id/read')
  public async markAsRead(
    @CurrentUser() user: SanitizedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true; notification: NotificationResponse }> {
    const notification = await this.notificationsService.markAsRead(user.id, id);
    return { success: true, notification };
  }

  @HttpCode(HttpStatus.OK)
  @Put('read-all')
  public async markAllAsRead(@CurrentUser() user: SanitizedUser): Promise<{ success: true }> {
    await this.notificationsService.markAllAsRead(user.id);
    return { success: true };
  }
}
