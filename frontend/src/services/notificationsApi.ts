import { api } from './api';
import type { PaginatedResponse } from '../types/pagination.types';
import type { NotificationResponse, NotificationType } from '../types/notification.types';

export interface NotificationsQuery {
  page?: number;
  limit?: number;
  type?: NotificationType;
  isRead?: boolean;
}

export const notificationsApi = {
  getAll: async (
    query: NotificationsQuery = {},
  ): Promise<PaginatedResponse<NotificationResponse>> => {
    const response = await api.get<PaginatedResponse<NotificationResponse>>('/notifications', {
      params: query,
    });
    return response.data;
  },

  markAsRead: async (id: string): Promise<NotificationResponse> => {
    const response = await api.put<{ success: true; notification: NotificationResponse }>(
      `/notifications/${id}/read`,
    );
    return response.data.notification;
  },

  markAllAsRead: async (): Promise<void> => {
    await api.put('/notifications/read-all');
  },
};
