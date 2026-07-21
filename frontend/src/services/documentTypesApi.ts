import { api } from './api';
import type { DocumentTypeResponse } from '../types/documentType.types';

export interface DocumentTypeInput {
  name: string;
  description?: string;
}

export const documentTypesApi = {
  getAll: async (includeInactive = false): Promise<DocumentTypeResponse[]> => {
    const response = await api.get<{ success: true; documentTypes: DocumentTypeResponse[] }>(
      '/document-types',
      { params: includeInactive ? { includeInactive: true } : {} },
    );
    return response.data.documentTypes;
  },

  create: async (input: DocumentTypeInput): Promise<DocumentTypeResponse> => {
    const response = await api.post<{ success: true; documentType: DocumentTypeResponse }>(
      '/document-types',
      input,
    );
    return response.data.documentType;
  },

  update: async (
    id: string,
    input: Partial<DocumentTypeInput> & { isActive?: boolean },
  ): Promise<DocumentTypeResponse> => {
    const response = await api.put<{ success: true; documentType: DocumentTypeResponse }>(
      `/document-types/${id}`,
      input,
    );
    return response.data.documentType;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/document-types/${id}`);
  },
};
