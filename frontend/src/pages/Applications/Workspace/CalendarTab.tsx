import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../../../components/Button/Button';
import { CalendarCard } from '../../../components/CalendarCard/CalendarCard';
import { CalendarEventForm } from '../../../components/CalendarEventForm/CalendarEventForm';
import { calendarApi } from '../../../services/calendarApi';

interface CalendarTabProps {
  applicationId: string;
}

const CALENDAR_PAGE_LIMIT = 50;

export function CalendarTab({ applicationId }: CalendarTabProps): JSX.Element {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const queryKey = ['calendar', { applicationId }];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => calendarApi.getAll({ applicationId, limit: CALENDAR_PAGE_LIMIT }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      calendarApi.update(id, { completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const handleCreated = (): void => {
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => setShowForm((prev) => !prev)}>
          {showForm ? 'Отмена' : 'Добавить событие'}
        </Button>
      </div>

      {showForm && <CalendarEventForm applicationId={applicationId} onCreated={handleCreated} />}

      {isLoading && <p className="text-ink-500">Загрузка...</p>}
      {isError && <p className="text-danger">Не удалось загрузить календарь заявки.</p>}
      {data && data.items.length === 0 && (
        <p className="text-ink-500">Событий по этой заявке пока нет.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="space-y-2">
          {data.items.map((event) => (
            <CalendarCard
              key={event.id}
              event={event}
              onToggleCompleted={(id, completed) => toggleMutation.mutate({ id, completed })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
