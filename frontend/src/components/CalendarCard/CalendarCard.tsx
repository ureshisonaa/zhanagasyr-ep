import type { ChangeEvent } from 'react';
import { EVENT_PRIORITY_LABELS, EVENT_PRIORITY_STYLES, EVENT_TYPE_LABELS } from '../../constants/calendarEvent.constants';
import type { CalendarEventResponse } from '../../types/calendarEvent.types';

interface CalendarCardProps {
  event: CalendarEventResponse;
  onToggleCompleted?: (id: string, completed: boolean) => void;
}

export function CalendarCard({ event, onToggleCompleted }: CalendarCardProps): JSX.Element {
  return (
    <div
      className={`flex items-start gap-3 rounded border border-ink-100 p-3 ${
        event.completed ? 'opacity-50' : ''
      }`}
    >
      {onToggleCompleted && (
        <input
          type="checkbox"
          checked={event.completed}
          onChange={(changeEvent: ChangeEvent<HTMLInputElement>) =>
            onToggleCompleted(event.id, changeEvent.target.checked)
          }
          className="mt-1 shrink-0"
          aria-label="Отметить выполненным"
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-medium text-ink-900 ${event.completed ? 'line-through' : ''}`}>
            {event.title}
          </p>
          <span className={`shrink-0 text-xs font-medium ${EVENT_PRIORITY_STYLES[event.priority]}`}>
            {EVENT_PRIORITY_LABELS[event.priority]}
          </span>
        </div>
        <p className="text-xs text-ink-500">
          {EVENT_TYPE_LABELS[event.type]} · {new Date(event.date).toLocaleDateString('ru-RU')}
        </p>
        {event.description && <p className="mt-1 text-xs text-ink-500">{event.description}</p>}
      </div>
    </div>
  );
}
