import { api } from './api';
import type { PaginatedResponse } from '../types/pagination.types';
import type { UniversityResponse } from '../types/university.types';

export interface UniversitiesQuery {
  page?: number;
  limit?: number;
  search?: string;
  country?: string;
  includeInactive?: boolean;
}

export interface UniversityInput {
  name: string;
  country: string;
  city: string;
  logo?: string;
  website?: string;
  description?: string;
  ranking?: number;
  tuition?: number;
  currency?: string;
}

export const universitiesApi = {
  getAll: async (query: UniversitiesQuery = {}): Promise<PaginatedResponse<UniversityResponse>> => {
    const response = await api.get<PaginatedResponse<UniversityResponse>>('/universities', {
      params: query,
    });
    return response.data;
  },

  getOne: async (id: string): Promise<UniversityResponse> => {
    const response = await api.get<{ success: true; university: UniversityResponse }>(
      `/universities/${id}`,
    );
    return response.data.university;
  },

  create: async (input: UniversityInput): Promise<UniversityResponse> => {
    const response = await api.post<{ success: true; university: UniversityResponse }>(
      '/universities',
      input,
    );
    return response.data.university;
  },

  update: async (
    id: string,
    input: Partial<UniversityInput> & { isActive?: boolean },
  ): Promise<UniversityResponse> => {
    const response = await api.put<{ success: true; university: UniversityResponse }>(
      `/universities/${id}`,
      input,
    );
    return response.data.university;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/universities/${id}`);
  },
};
