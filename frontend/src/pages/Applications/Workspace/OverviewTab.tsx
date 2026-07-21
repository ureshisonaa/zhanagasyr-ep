import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FiX } from 'react-icons/fi';
import { Button } from '../../../components/Button/Button';
import { ProgressBreakdown } from '../../../components/ProgressBar/ProgressBreakdown';
import { activityLogApi } from '../../../services/activityLogApi';
import { aiSuggestionsApi } from '../../../services/aiSuggestionsApi';
import { progressApi } from '../../../services/progressApi';
import type { ApplicationResponse } from '../../../types/application.types';

interface OverviewTabProps {
  application: ApplicationResponse;
}

const RECENT_ACTIVITY_LIMIT = 10;

export function OverviewTab({ application }: OverviewTabProps): JSX.Element {
  const queryClient = useQueryClient();
  const suggestionsQueryKey = ['ai-suggestions', application.id];

  const { data: activityEntries, isLoading: isActivityLoading } = useQuery({
    queryKey: ['activity-log', application.id],
    queryFn: () => activityLogApi.getAllForApplication(application.id, RECENT_ACTIVITY_LIMIT),
  });

  const { data: progress } = useQuery({
    queryKey: ['progress', application.id],
    queryFn: () => progressApi.getForApplication(application.id),
  });

  const { data: suggestions, isLoading: isSuggestionsLoading } = useQuery({
    queryKey: suggestionsQueryKey,
    queryFn: () => aiSuggestionsApi.getAllForApplication(application.id),
  });

  const generateMutation = useMutation({
    mutationFn: () => aiSuggestionsApi.generate(application.id),
    onSuccess: () => {
      toast.success('Рекомендация сгенерирована');
      queryClient.invalidateQueries({ queryKey: suggestionsQueryKey });
    },
    onError: () => toast.error('Не удалось сгенерировать рекомендацию'),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => aiSuggestionsApi.dismiss(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: suggestionsQueryKey }),
  });

  return (
    <div className="space-y-6">
      {progress && (
        <section>
          <ProgressBreakdown progress={progress} />
        </section>
      )}

      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-ink-500">Статус</dt>
          <dd className="font-medium text-ink-900">{application.currentStageLabel}</dd>
        </div>
        {application.deadline && (
          <div>
            <dt className="text-ink-500">Ближайший дедлайн</dt>
            <dd className="font-medium text-ink-900">
              {new Date(application.deadline).toLocaleDateString('ru-RU')}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-ink-500">Создана</dt>
          <dd className="font-medium text-ink-900">
            {new Date(application.createdAt).toLocaleDateString('ru-RU')}
          </dd>
        </div>
      </dl>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink-700">AI-рекомендации</h2>
          <Button
            variant="secondary"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? 'Генерация...' : 'Сгенерировать рекомендацию'}
          </Button>
        </div>

        {isSuggestionsLoading && <p className="text-sm text-ink-500">Загрузка...</p>}
        {suggestions && suggestions.length === 0 && (
          <p className="text-sm text-ink-500">Рекомендаций пока нет.</p>
        )}

        {suggestions && suggestions.length > 0 && (
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="rounded border border-ink-100 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-ink-900">{suggestion.title}</p>
                  {suggestion.kind === 'stored' && (
                    <button
                      type="button"
                      onClick={() => dismissMutation.mutate(suggestion.id)}
                      className="text-ink-400 hover:text-danger"
                      aria-label="Скрыть рекомендацию"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-700">{suggestion.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-700">Последние действия</h2>

        {isActivityLoading && <p className="text-sm text-ink-500">Загрузка...</p>}
        {activityEntries && activityEntries.length === 0 && (
          <p className="text-sm text-ink-500">Действий по заявке пока нет.</p>
        )}

        {activityEntries && activityEntries.length > 0 && (
          <ul className="space-y-2 border-l border-ink-100 pl-4">
            {activityEntries.map((entry) => (
              <li key={entry.id} className="text-sm">
                <p className="text-ink-900">{entry.description}</p>
                <p className="text-xs text-ink-500">
                  {entry.actorName ?? 'Система'} ·{' '}
                  {new Date(entry.createdAt).toLocaleString('ru-RU')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}
