import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { FiBell } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { Avatar } from '../Avatar/Avatar';
import { Button } from '../Button/Button';
import { NotificationCard } from '../NotificationCard/NotificationCard';
import { useClickOutside } from '../../hooks/useClickOutside';
import { notificationsApi } from '../../services/notificationsApi';
import { useAuthStore } from '../../store/authStore';

const NOTIFICATIONS_QUERY_KEY = ['notifications', 'mine'];
const NOTIFICATIONS_PANEL_LIMIT = 10;

export function Navbar(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useClickOutside(panelRef, () => setIsPanelOpen(false));

  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();

  const { data } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => notificationsApi.getAll({ limit: NOTIFICATIONS_PANEL_LIMIT }),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });

  const unreadCount = data?.items.filter((notification) => !notification.isRead).length ?? 0;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-ink-100 bg-ink-0 px-6">
      <span className="text-lg font-semibold tracking-tight text-ink-900">
        ZhanaGasyr Education Platform
      </span>

      <div className="flex items-center gap-3">
        <div ref={panelRef} className="relative">
          <button
            type="button"
            onClick={() => setIsPanelOpen((prev) => !prev)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900"
            aria-label="Уведомления"
          >
            <FiBell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-medium text-ink-0">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isPanelOpen && (
            <div className="absolute right-0 top-11 z-10 w-80 rounded border border-ink-100 bg-ink-0 shadow-lg">
              <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2">
                <span className="text-sm font-medium text-ink-900">Уведомления</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllAsReadMutation.mutate()}
                    className="text-xs text-info hover:underline"
                  >
                    Прочитать все
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {data && data.items.length === 0 && (
                  <p className="px-3 py-4 text-center text-sm text-ink-500">Уведомлений пока нет.</p>
                )}
                {data?.items.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onClick={(id) => markAsReadMutation.mutate(id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <Link to="/settings" className="flex items-center gap-2">
          <Avatar src={user?.avatar ?? null} name={fullName || 'U'} size="sm" />
          <span className="hidden text-sm font-medium text-ink-700 sm:inline">{fullName}</span>
        </Link>
        <Button variant="secondary" onClick={() => void logout()}>
          Выйти
        </Button>
      </div>
    </header>
  );
}
