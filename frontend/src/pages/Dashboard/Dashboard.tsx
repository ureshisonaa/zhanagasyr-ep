import { useQueries, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ApplicationCard } from '../../components/ApplicationCard/ApplicationCard';
import { Button } from '../../components/Button/Button';
import { ProgressBar } from '../../components/ProgressBar/ProgressBar';
import { applicationsApi } from '../../services/applicationsApi';
import { progressApi } from '../../services/progressApi';
import { useAuthStore } from '../../store/authStore';

const DASHBOARD_APPLICATIONS_LIMIT = 20;

/**
 * Список заявок здесь — простое отображение под общим Dashboard, не сам
 * Application Workspace (тот — отдельная страница /applications/:id,
 * Этап 3.4). Карточки ведут туда.
 *
 * Прогресс (Этап 9.2, Roadmap: "агрегированный прогресс по всем заявкам")
 * запрашивается по каждой заявке отдельно через useQueries — прогресс
 * нигде не хранится (Этап 9.1: всегда вычисляется заново на backend),
 * поэтому batch-эндпоинта для списка заявок нет. Для типичного объёма
 * заявок одного студента (единицы, не сотни) N параллельных запросов —
 * оправданная простота, а не проблема производительности.
 */
export function Dashboard(): JSX.Element {
  const user = useAuthStore((state) => state.user);

  const { data, isLoading } = useQuery({
    queryKey: ['applications', 'mine'],
    queryFn: () => applicationsApi.getAll({ limit: DASHBOARD_APPLICATIONS_LIMIT }),
  });

  const progressQueries = useQueries({
    queries: (data?.items ?? []).map((application) => ({
      queryKey: ['progress', application.id],
      queryFn: () => progressApi.getForApplication(application.id),
    })),
  });

  const loadedProgressValues = progressQueries
    .map((query) => query.data)
    .filter((progress): progress is NonNullable<typeof progress> => Boolean(progress));

  const aggregatedProgress =
    loadedProgressValues.length > 0
      ? Math.round(
          loadedProgressValues.reduce((sum, progress) => sum + progress.total, 0) /
            loadedProgressValues.length,
        )
      : null;

  return (
    <div className="px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-ink-900">Добро пожаловать, {user?.firstName}!</h1>
        <Link to="/applications/new">
          <Button>Создать заявку</Button>
        </Link>
      </div>

      {aggregatedProgress !== null && (
        <section className="mt-6 max-w-sm">
          <ProgressBar value={aggregatedProgress} label="Средний прогресс по всем заявкам" />
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-medium text-ink-900">Ваши заявки</h2>

        {isLoading && <p className="text-ink-500">Загрузка...</p>}

        {data && data.items.length === 0 && (
          <p className="text-ink-500">
            У вас пока нет заявок. Нажмите «Создать заявку», чтобы начать.
          </p>
        )}

        {data && data.items.length > 0 && (
          <div className="space-y-3">
            {data.items.map((application, index) => (
              <ApplicationCard
                key={application.id}
                application={application}
                progress={progressQueries[index]?.data}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
