import { api } from './api';
import type { ApplicationResponse, ApplicationStatus } from '../types/application.types';
import type { PaginatedResponse } from '../types/pagination.types';

export interface CreateApplicationInput {
  universityId: string;
  programId: string;
  admissionCycleId: string;
}

export interface ApplicationsQuery {
  page?: number;
  limit?: number;
  applicationStatus?: ApplicationStatus;
  /** Работает только для Mentor/Admin/SuperAdmin — см. QueryApplicationsDto на backend. */
  userId?: string;
}

export const applicationsApi = {
  create: async (input: CreateApplicationInput): Promise<ApplicationResponse> => {
    const response = await api.post<{ success: true; application: ApplicationResponse }>(
      '/applications',
      input,
    );
    return response.data.application;
  },

  getAll: async (
    query: ApplicationsQuery = {},
  ): Promise<PaginatedResponse<ApplicationResponse>> => {
    const response = await api.get<PaginatedResponse<ApplicationResponse>>('/applications', {
      params: query,
    });
    return response.data;
  },

  getOne: async (id: string): Promise<ApplicationResponse> => {
    const response = await api.get<{ success: true; application: ApplicationResponse }>(
      `/applications/${id}`,
    );
    return response.data.application;
  },

  updateStatus: async (
    id: string,
    applicationStatus: ApplicationStatus,
  ): Promise<ApplicationResponse> => {
    const response = await api.put<{ success: true; application: ApplicationResponse }>(
      `/applications/${id}/status`,
      { applicationStatus },
    );
    return response.data.application;
  },
};
