import { api } from './api';
import type { PaginatedResponse } from '../types/pagination.types';
import type {
  CalendarEventPriority,
  CalendarEventResponse,
  CalendarEventType,
} from '../types/calendarEvent.types';

export interface CalendarEventsQuery {
  page?: number;
  limit?: number;
  applicationId?: string;
  type?: CalendarEventType;
  completed?: boolean;
}

export interface CreateCalendarEventInput {
  applicationId?: string;
  title: string;
  description?: string;
  type: CalendarEventType;
  date: string;
  priority?: CalendarEventPriority;
}

export interface UpdateCalendarEventInput {
  title?: string;
  description?: string;
  type?: CalendarEventType;
  date?: string;
  priority?: CalendarEventPriority;
  completed?: boolean;
}

export const calendarApi = {
  getAll: async (
    query: CalendarEventsQuery = {},
  ): Promise<PaginatedResponse<CalendarEventResponse>> => {
    const response = await api.get<PaginatedResponse<CalendarEventResponse>>('/calendar', {
      params: query,
    });
    return response.data;
  },

  create: async (input: CreateCalendarEventInput): Promise<CalendarEventResponse> => {
    const response = await api.post<{ success: true; event: CalendarEventResponse }>(
      '/calendar',
      input,
    );
    return response.data.event;
  },

  update: async (id: string, input: UpdateCalendarEventInput): Promise<CalendarEventResponse> => {
    const response = await api.put<{ success: true; event: CalendarEventResponse }>(
      `/calendar/${id}`,
      input,
    );
    return response.data.event;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/calendar/${id}`);
  },
};
