import { api } from './api';
import type { PaginatedResponse } from '../types/pagination.types';
import type { AdminLogEntryResponse } from '../types/adminLog.types';

export interface AdminLogsQuery {
  page?: number;
  limit?: number;
}

export const adminLogsApi = {
  getAll: async (query: AdminLogsQuery = {}): Promise<PaginatedResponse<AdminLogEntryResponse>> => {
    const response = await api.get<PaginatedResponse<AdminLogEntryResponse>>('/admin/logs', {
      params: query,
    });
    return response.data;
  },
};
