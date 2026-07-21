import { api } from './api';
import type { DocumentResponse } from '../types/document.types';
import type { PaginatedResponse } from '../types/pagination.types';

export interface DocumentsQuery {
  page?: number;
  limit?: number;
}

export const documentsApi = {
  /**
   * Content-Type НЕ выставляется вручную — для тела-FormData axios сам
   * ставит "multipart/form-data; boundary=..." (тот же принцип, что и в
   * usersApi.updateAvatar, Этап 1.4).
   */
  upload: async (documentTypeId: string, file: File): Promise<DocumentResponse> => {
    const formData = new FormData();
    formData.append('documentTypeId', documentTypeId);
    formData.append('file', file);

    const response = await api.post<{ success: true; document: DocumentResponse }>(
      '/documents/upload',
      formData,
    );
    return response.data.document;
  },

  /** Пагинация (Этап 12.2) — раньше отдавался весь список без неё. */
  getAll: async (query: DocumentsQuery = {}): Promise<PaginatedResponse<DocumentResponse>> => {
    const response = await api.get<PaginatedResponse<DocumentResponse>>('/documents', {
      params: query,
    });
    return response.data;
  },

  /** Только Mentor/Admin/SuperAdmin (backend, Этап 10.1) — коррекция ошибочного AI-вердикта. */
  updateStatus: async (
    id: string,
    status: string,
    verificationResult?: string,
  ): Promise<DocumentResponse> => {
    const response = await api.put<{ success: true; document: DocumentResponse }>(
      `/documents/${id}/status`,
      { status, verificationResult },
    );
    return response.data.document;
  },
};
