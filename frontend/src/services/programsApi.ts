import { api } from './api';
import type { DegreeLevel, ProgramResponse } from '../types/program.types';
import type { PaginatedResponse } from '../types/pagination.types';

export interface ProgramsQuery {
  page?: number;
  limit?: number;
  search?: string;
  universityId?: string;
  degreeLevel?: DegreeLevel;
  includeInactive?: boolean;
}

export interface ProgramInput {
  universityId: string;
  name: string;
  degreeLevel: DegreeLevel;
  description?: string;
  duration?: string;
}

export const programsApi = {
  getAll: async (query: ProgramsQuery = {}): Promise<PaginatedResponse<ProgramResponse>> => {
    const response = await api.get<PaginatedResponse<ProgramResponse>>('/programs', {
      params: query,
    });
    return response.data;
  },

  getOne: async (id: string): Promise<ProgramResponse> => {
    const response = await api.get<{ success: true; program: ProgramResponse }>(`/programs/${id}`);
    return response.data.program;
  },

  create: async (input: ProgramInput): Promise<ProgramResponse> => {
    const response = await api.post<{ success: true; program: ProgramResponse }>(
      '/programs',
      input,
    );
    return response.data.program;
  },

  update: async (
    id: string,
    input: Partial<ProgramInput> & { isActive?: boolean },
  ): Promise<ProgramResponse> => {
    const response = await api.put<{ success: true; program: ProgramResponse }>(
      `/programs/${id}`,
      input,
    );
    return response.data.program;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/programs/${id}`);
  },
};
