import { Injectable, NotFoundException } from '@nestjs/common';
import type { Notification, NotificationType, Prisma } from '@prisma/client';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { PrismaService } from '../prisma/prisma.service';
import type { QueryNotificationsDto } from './dto/query-notifications.dto';
import type { NotificationResponse } from './interfaces/notification-response.interface';
import { toNotificationResponse } from './utils/to-notification-response.util';

@Injectable()
export class NotificationsService {
  public constructor(private readonly prisma: PrismaService) {}

  /**
   * Только для использования другими backend-сервисами (например, будущим
   * cron-заданием дедлайнов, Этап 7.3) — не выставлен через REST. Все типы
   * уведомлений (System/AI/Calendar/Document/University/Admin) подразумевают
   * системную генерацию, у пользователя нет сценария "создать себе
   * уведомление вручную".
   */
  public async create(
    userId: string,
    title: string,
    message: string,
    type: NotificationType,
  ): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.create({
      data: { userId, title, message, type },
    });

    return toNotificationResponse(notification);
  }

  public async findAllForUser(
    userId: string,
    query: QueryNotificationsDto,
  ): Promise<PaginatedResult<NotificationResponse>> {
    const { page, limit, type, isRead } = query;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(type ? { type } : {}),
      ...(isRead !== undefined ? { isRead } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items: items.map(toNotificationResponse),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  public async markAsRead(userId: string, id: string): Promise<NotificationResponse> {
    await this.ensureOwned(userId, id);

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return toNotificationResponse(updated);
  }

  public async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  private async ensureOwned(userId: string, id: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({ where: { id } });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }
}
