import type { CalendarEventPriority, CalendarEventType } from '../types/calendarEvent.types';

export const EVENT_TYPES: CalendarEventType[] = [
  'IELTS',
  'SAT',
  'Deadline',
  'Interview',
  'Visa',
  'Meeting',
  'Reminder',
  'Application',
  'Other',
];

export const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  IELTS: 'IELTS',
  SAT: 'SAT',
  Deadline: 'Дедлайн',
  Interview: 'Интервью',
  Visa: 'Виза',
  Meeting: 'Встреча',
  Reminder: 'Напоминание',
  Application: 'Заявка',
  Other: 'Другое',
};

export const EVENT_PRIORITIES: CalendarEventPriority[] = ['Low', 'Medium', 'High', 'Critical'];

export const EVENT_PRIORITY_LABELS: Record<CalendarEventPriority, string> = {
  Low: 'Низкий',
  Medium: 'Средний',
  High: 'Высокий',
  Critical: 'Критичный',
};

export const EVENT_PRIORITY_STYLES: Record<CalendarEventPriority, string> = {
  Low: 'text-ink-500',
  Medium: 'text-info',
  High: 'text-warning',
  Critical: 'text-danger',
};
