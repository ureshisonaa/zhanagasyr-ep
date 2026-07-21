import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import { applicationsApi } from '../../../services/applicationsApi';
import type { ApplicationStatus } from '../../../types/application.types';

const FINAL_STATUSES: ApplicationStatus[] = ['Accepted', 'Rejected', 'Enrolled'];
const FINAL_STATUS_LABELS: Record<string, string> = {
  Accepted: 'Принят',
  Rejected: 'Отклонён',
  Enrolled: 'Зачислен',
};

const QUEUE_PAGE_LIMIT = 50;

/** Roadmap, Этап 11.4 — путь frontend/src/pages/Admin/ApplicationsFinalStatus/. */
export function ApplicationsFinalStatus(): JSX.Element {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus>('WaitingForDecision');
  const queryKey = ['admin', 'applications-final-status', statusFilter];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => applicationsApi.getAll({ applicationStatus: statusFilter, limit: QUEUE_PAGE_LIMIT }),
  });

  const setFinalStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      applicationsApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Статус заявки обновлён');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Не удалось изменить статус заявки'),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-500">
        Финальные статусы (Принят/Отклонён/Зачислен) может выставить только Admin/SuperAdmin.
      </p>

      <div>
        <label htmlFor="statusFilter" className="mb-1 block text-sm font-medium text-ink-700">
          Показать заявки со статусом
        </label>
        <select
          id="statusFilter"
          value={statusFilter}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            setStatusFilter(event.target.value as ApplicationStatus)
          }
          className="w-full max-w-xs rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
        >
          <option value="WaitingForDecision">Ожидание решения</option>
          <option value="Interview">Интервью</option>
          <option value="SubmittingApplication">Подача заявки</option>
        </select>
      </div>

      {isLoading && <p className="text-ink-500">Загрузка...</p>}
      {isError && <p className="text-danger">Не удалось загрузить заявки.</p>}
      {data && data.items.length === 0 && (
        <p className="text-ink-500">Заявок с этим статусом нет.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="space-y-2">
          {data.items.map((application) => (
            <div
              key={application.id}
              className="flex items-center justify-between gap-3 rounded border border-ink-100 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-900">{application.title}</p>
                <p className="text-xs text-ink-500">{application.studentName}</p>
              </div>

              <div className="flex shrink-0 gap-2">
                {FINAL_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFinalStatusMutation.mutate({ id: application.id, status })}
                    disabled={setFinalStatusMutation.isPending}
                    className="rounded border border-ink-200 px-2 py-1 text-xs text-ink-700 hover:border-ink-400"
                  >
                    {FINAL_STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
