export type CalendarEventType =
  | 'IELTS'
  | 'SAT'
  | 'Deadline'
  | 'Interview'
  | 'Visa'
  | 'Meeting'
  | 'Reminder'
  | 'Application'
  | 'Other';

export type CalendarEventPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface CalendarEventResponse {
  id: string;
  userId: string;
  applicationId: string | null;
  title: string;
  description: string | null;
  type: CalendarEventType;
  date: string;
  completed: boolean;
  priority: CalendarEventPriority;
  createdAt: string;
  updatedAt: string;
}
