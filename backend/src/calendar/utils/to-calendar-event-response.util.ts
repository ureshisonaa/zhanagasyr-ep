import type { CalendarEvent } from '@prisma/client';
import type { CalendarEventResponse } from '../interfaces/calendar-event-response.interface';

export function toCalendarEventResponse(event: CalendarEvent): CalendarEventResponse {
  return {
    id: event.id,
    userId: event.userId,
    applicationId: event.applicationId,
    title: event.title,
    description: event.description,
    type: event.type,
    date: event.date,
    completed: event.completed,
    priority: event.priority,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}
