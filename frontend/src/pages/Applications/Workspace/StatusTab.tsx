import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../../../components/Button/Button';
import { applicationsApi } from '../../../services/applicationsApi';
import { useAuthStore } from '../../../store/authStore';
import type { ApplicationResponse, ApplicationStatus } from '../../../types/application.types';

interface StatusTabProps {
  application: ApplicationResponse;
}

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'Planning', label: 'Планирование' },
  { value: 'PreparingDocuments', label: 'Подготовка документов' },
  { value: 'WritingEssays', label: 'Написание эссе' },
  { value: 'SubmittingApplication', label: 'Подача заявки' },
  { value: 'Interview', label: 'Интервью' },
  { value: 'WaitingForDecision', label: 'Ожидание решения' },
  { value: 'Accepted', label: 'Принято' },
  { value: 'Rejected', label: 'Отклонено' },
  { value: 'Enrolled', label: 'Зачислен(а)' },
];

const FINAL_STATUSES: ApplicationStatus[] = ['Accepted', 'Rejected', 'Enrolled'];

export function StatusTab({ application }: StatusTabProps): JSX.Element {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin';
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus>(
    application.applicationStatus,
  );

  // Финальные статусы скрыты из выбора для не-админов на уровне UI — backend
  // всё равно отклонит попытку (Этап 3.1), но так пользователь не наткнётся
  // на ошибку 403 после клика.
  const availableOptions = STATUS_OPTIONS.filter(
    (option) => isAdmin || !FINAL_STATUSES.includes(option.value),
  );

  const mutation = useMutation({
    mutationFn: (status: ApplicationStatus) => applicationsApi.updateStatus(application.id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(['applications', application.id], updated);
      toast.success('Статус обновлён');
    },
    onError: () => toast.error('Не удалось обновить статус'),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-500">
        Текущий статус: <span className="font-medium text-ink-900">{application.currentStageLabel}</span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedStatus}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            setSelectedStatus(event.target.value as ApplicationStatus)
          }
          className="rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
        >
          {availableOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button
          disabled={selectedStatus === application.applicationStatus || mutation.isPending}
          onClick={() => mutation.mutate(selectedStatus)}
        >
          {mutation.isPending ? 'Обновление...' : 'Обновить статус'}
        </Button>
      </div>

      {!isAdmin && (
        <p className="text-sm text-ink-500">
          Финальные статусы (Принято / Отклонено / Зачислен) может выставить только
          администратор.
        </p>
      )}
    </div>
  );
}
