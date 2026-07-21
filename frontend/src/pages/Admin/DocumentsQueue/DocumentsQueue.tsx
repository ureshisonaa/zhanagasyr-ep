import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { StatusBadge } from '../../../components/StatusBadge/StatusBadge';
import { documentsApi } from '../../../services/documentsApi';
import { documentsReviewApi } from '../../../services/documentsReviewApi';

const QUEUE_PAGE_LIMIT = 50;

/** Roadmap, Этап 11.4 — путь frontend/src/pages/Admin/DocumentsQueue/. */
export function DocumentsQueue(): JSX.Element {
  const queryClient = useQueryClient();
  const queryKey = ['admin', 'documents-review'];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => documentsReviewApi.getAll({ limit: QUEUE_PAGE_LIMIT }),
  });

  const decideMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Approved' | 'Rejected' }) =>
      documentsApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Решение сохранено');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Не удалось сохранить решение'),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-500">
        Документы, которые AI-проверка не смогла однозначно одобрить или отклонить — требуется
        ручное решение администратора.
      </p>

      {isLoading && <p className="text-ink-500">Загрузка...</p>}
      {isError && <p className="text-danger">Не удалось загрузить очередь.</p>}
      {data && data.items.length === 0 && (
        <p className="text-ink-500">Очередь пуста — все документы обработаны.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="space-y-2">
          {data.items.map((item) => (
            <div key={item.id} className="rounded border border-ink-100 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{item.fileName}</p>
                  <p className="text-xs text-ink-500">
                    {item.documentTypeName} · {item.studentName}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>

              {item.verificationResult && (
                <p className="mt-2 text-xs text-ink-500">{item.verificationResult}</p>
              )}

              <div className="mt-3 flex items-center gap-3 text-sm">
                {item.driveUrl && (
                  <a
                    href={item.driveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-info hover:underline"
                  >
                    Открыть файл
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => decideMutation.mutate({ id: item.id, status: 'Approved' })}
                  disabled={decideMutation.isPending}
                  className="text-success hover:underline"
                >
                  Одобрить
                </button>
                <button
                  type="button"
                  onClick={() => decideMutation.mutate({ id: item.id, status: 'Rejected' })}
                  disabled={decideMutation.isPending}
                  className="text-danger hover:underline"
                >
                  Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
