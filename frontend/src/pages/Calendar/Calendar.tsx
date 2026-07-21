import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CalendarCard } from '../../components/CalendarCard/CalendarCard';
import { CalendarEventForm } from '../../components/CalendarEventForm/CalendarEventForm';
import { Button } from '../../components/Button/Button';
import { calendarApi } from '../../services/calendarApi';

const CALENDAR_QUERY_KEY = ['calendar', 'mine'];
const CALENDAR_PAGE_LIMIT = 50;

export function Calendar(): JSX.Element {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: CALENDAR_QUERY_KEY,
    queryFn: () => calendarApi.getAll({ limit: CALENDAR_PAGE_LIMIT }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      calendarApi.update(id, { completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEY }),
  });

  const handleCreated = (): void => {
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEY });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Календарь</h1>
        <Button variant={showForm ? 'secondary' : 'primary'} onClick={() => setShowForm((prev) => !prev)}>
          {showForm ? 'Отмена' : 'Добавить событие'}
        </Button>
      </div>

      {showForm && <CalendarEventForm onCreated={handleCreated} />}

      {isLoading && <p className="text-ink-500">Загрузка...</p>}
      {isError && <p className="text-danger">Не удалось загрузить календарь.</p>}
      {data && data.items.length === 0 && <p className="text-ink-500">Событий пока нет.</p>}

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
