import type { NotificationResponse } from '../../types/notification.types';

interface NotificationCardProps {
  notification: NotificationResponse;
  onClick?: (id: string) => void;
}

export function NotificationCard({ notification, onClick }: NotificationCardProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onClick?.(notification.id)}
      className={`block w-full border-b border-ink-100 px-3 py-2 text-left last:border-b-0 hover:bg-ink-50 ${
        notification.isRead ? '' : 'bg-info/5'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink-900">{notification.title}</p>
        {!notification.isRead && (
          <span className="h-2 w-2 shrink-0 rounded-full bg-info" aria-hidden />
        )}
      </div>
      <p className="mt-0.5 text-xs text-ink-500">{notification.message}</p>
      <p className="mt-0.5 text-xs text-ink-400">
        {new Date(notification.createdAt).toLocaleDateString('ru-RU')}
      </p>
    </button>
  );
}
