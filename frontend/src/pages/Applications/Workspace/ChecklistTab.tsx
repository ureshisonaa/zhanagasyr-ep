import { useQuery } from '@tanstack/react-query';
import { checklistsApi } from '../../../services/checklistsApi';

interface ChecklistTabProps {
  applicationId: string;
}

export function ChecklistTab({ applicationId }: ChecklistTabProps): JSX.Element {
  const {
    data: checklist,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['checklists', applicationId],
    queryFn: () => checklistsApi.getByApplication(applicationId),
  });

  if (isLoading) {
    return <p className="text-ink-500">Загрузка чек-листа...</p>;
  }

  if (isError || !checklist) {
    return <p className="text-danger">Не удалось загрузить чек-лист.</p>;
  }

  const totalCount = checklist.items.length;
  const completedCount = checklist.items.filter((item) => item.isCompleted).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {totalCount > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-ink-500">
              Выполнено {completedCount} из {totalCount}
            </span>
            <span className="font-medium text-ink-900">{progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full bg-ink-900 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {totalCount === 0 && (
        <p className="text-ink-500">У выбранной программы нет заданных требований к чек-листу.</p>
      )}

      <ul className="space-y-2">
        {checklist.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 rounded border border-ink-100 p-3">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                item.isCompleted
                  ? 'border-success bg-success text-ink-0'
                  : 'border-ink-200 text-transparent'
              }`}
            >
              ✓
            </span>
            <span className={item.isCompleted ? 'text-ink-500 line-through' : 'text-ink-900'}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      {totalCount > 0 && (
        <p className="text-sm text-ink-500">
          Пункты пока нельзя отметить вручную — автоматическая отметка при одобрении документа
          (Фаза 6) и ручная отметка наставником (Фаза 10) появятся позже.
        </p>
      )}
    </div>
  );
}
