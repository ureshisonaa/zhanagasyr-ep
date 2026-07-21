import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { applicationsApi } from '../../services/applicationsApi';

const FETCH_LIMIT = 100;

export function StudentApplications(): JSX.Element {
  const { userId } = useParams<{ userId: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['applications', 'for-student', userId],
    queryFn: () => applicationsApi.getAll({ userId, limit: FETCH_LIMIT }),
    enabled: Boolean(userId),
  });

  const studentName = data?.items[0]?.studentName;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <div>
        <Link to="/mentor/students" className="text-sm text-ink-500 hover:text-ink-900">
          ← Все студенты
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
          {studentName ?? 'Заявки студента'}
        </h1>
      </div>

      {isLoading && <p className="text-ink-500">Загрузка...</p>}
      {isError && <p className="text-danger">Не удалось загрузить заявки.</p>}
      {data && data.items.length === 0 && <p className="text-ink-500">У студента пока нет заявок.</p>}

      {data && data.items.length > 0 && (
        <div className="space-y-2">
          {data.items.map((application) => (
            <Link
              key={application.id}
              to={`/mentor/applications/${application.id}`}
              className="block rounded border border-ink-100 p-4 transition-colors hover:border-ink-400"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium text-ink-900">{application.title}</h3>
                <span className="shrink-0 rounded-full bg-ink-100 px-2 py-1 text-xs font-medium text-ink-700">
                  {application.currentStageLabel}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
