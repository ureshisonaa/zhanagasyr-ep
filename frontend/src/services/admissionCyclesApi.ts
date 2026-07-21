import { api } from './api';
import type { AdmissionCycleResponse, AdmissionSeason } from '../types/admissionCycle.types';
import type { PaginatedResponse } from '../types/pagination.types';

export interface AdmissionCyclesQuery {
  page?: number;
  limit?: number;
  year?: number;
  season?: AdmissionSeason;
  includeInactive?: boolean;
}

export interface AdmissionCycleInput {
  name: string;
  season: AdmissionSeason;
  year: number;
  startDate: string;
  endDate: string;
}

export const admissionCyclesApi = {
  getAll: async (
    query: AdmissionCyclesQuery = {},
  ): Promise<PaginatedResponse<AdmissionCycleResponse>> => {
    const response = await api.get<PaginatedResponse<AdmissionCycleResponse>>(
      '/admission-cycles',
      { params: query },
    );
    return response.data;
  },

  create: async (input: AdmissionCycleInput): Promise<AdmissionCycleResponse> => {
    const response = await api.post<{ success: true; admissionCycle: AdmissionCycleResponse }>(
      '/admission-cycles',
      input,
    );
    return response.data.admissionCycle;
  },

  update: async (
    id: string,
    input: Partial<AdmissionCycleInput> & { isActive?: boolean },
  ): Promise<AdmissionCycleResponse> => {
    const response = await api.put<{ success: true; admissionCycle: AdmissionCycleResponse }>(
      `/admission-cycles/${id}`,
      input,
    );
    return response.data.admissionCycle;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/admission-cycles/${id}`);
  },
};
