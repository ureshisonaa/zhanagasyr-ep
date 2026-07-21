import type { Notification } from '@prisma/client';
import type { NotificationResponse } from '../interfaces/notification-response.interface';

export function toNotificationResponse(notification: Notification): NotificationResponse {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
  };
}
