import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../../../components/Button/Button';
import { adminLogsApi } from '../../../services/adminLogsApi';

const PAGE_LIMIT = 50;

const METHOD_STYLES: Record<string, string> = {
  POST: 'bg-success/10 text-success',
  PUT: 'bg-info/10 text-info',
  PATCH: 'bg-info/10 text-info',
  DELETE: 'bg-danger/10 text-danger',
};

/** Roadmap, Этап 11.5 — путь frontend/src/pages/Admin/Logs/. */
export function AdminLogs(): JSX.Element {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'logs', page],
    queryFn: () => adminLogsApi.getAll({ page, limit: PAGE_LIMIT }),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-500">
        Автоматический аудит: каждое изменяющее действие (создание/редактирование/удаление),
        выполненное Admin или SuperAdmin, записывается сюда без участия разработчика.
      </p>

      {isLoading && <p className="text-ink-500">Загрузка...</p>}
      {isError && <p className="text-danger">Не удалось загрузить логи.</p>}
      {data && data.items.length === 0 && <p className="text-ink-500">Записей пока нет.</p>}

      {data && data.items.length > 0 && (
        <div className="overflow-hidden rounded border border-ink-100">
          {data.items.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-3 border-b border-ink-100 px-3 py-2 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                    METHOD_STYLES[entry.method] ?? 'bg-ink-100 text-ink-700'
                  }`}
                >
                  {entry.method}
                </span>
                <span className="truncate text-sm text-ink-900">{entry.path}</span>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-ink-500">
                <span>{entry.adminName}</span>
                <span>{new Date(entry.createdAt).toLocaleString('ru-RU')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Назад
          </Button>
          <span className="text-sm text-ink-500">
            Страница {data.meta.page} из {data.meta.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Далее
          </Button>
        </div>
      )}
    </div>
  );
}
