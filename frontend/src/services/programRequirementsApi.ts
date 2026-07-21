import { api } from './api';
import type { ProgramRequirementResponse } from '../types/programRequirement.types';

export interface ProgramRequirementInput {
  documentTypeId?: string;
  label: string;
  isRequired?: boolean;
  order?: number;
}

export const programRequirementsApi = {
  getAllForProgram: async (programId: string): Promise<ProgramRequirementResponse[]> => {
    const response = await api.get<{ success: true; requirements: ProgramRequirementResponse[] }>(
      `/programs/${programId}/requirements`,
    );
    return response.data.requirements;
  },

  create: async (
    programId: string,
    input: ProgramRequirementInput,
  ): Promise<ProgramRequirementResponse> => {
    const response = await api.post<{ success: true; requirement: ProgramRequirementResponse }>(
      `/programs/${programId}/requirements`,
      input,
    );
    return response.data.requirement;
  },

  update: async (
    programId: string,
    requirementId: string,
    input: Partial<ProgramRequirementInput>,
  ): Promise<ProgramRequirementResponse> => {
    const response = await api.put<{ success: true; requirement: ProgramRequirementResponse }>(
      `/programs/${programId}/requirements/${requirementId}`,
      input,
    );
    return response.data.requirement;
  },

  remove: async (programId: string, requirementId: string): Promise<void> => {
    await api.delete(`/programs/${programId}/requirements/${requirementId}`);
  },
};
