import type { CalendarEventPriority, CalendarEventType } from '@prisma/client';

export interface CalendarEventResponse {
  id: string;
  userId: string;
  applicationId: string | null;
  title: string;
  description: string | null;
  type: CalendarEventType;
  date: Date;
  completed: boolean;
  priority: CalendarEventPriority;
  createdAt: Date;
  updatedAt: Date;
}
