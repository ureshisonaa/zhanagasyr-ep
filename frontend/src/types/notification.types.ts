export type NotificationType = 'System' | 'AI' | 'Calendar' | 'Document' | 'University' | 'Admin';

export interface NotificationResponse {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}
