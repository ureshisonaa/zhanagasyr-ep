import { api } from './api';
import type { PaginatedResponse } from '../types/pagination.types';
import type { DocumentReviewItemResponse } from '../types/documentReview.types';

export interface DocumentsReviewQuery {
  page?: number;
  limit?: number;
  status?: string;
}

export const documentsReviewApi = {
  getAll: async (
    query: DocumentsReviewQuery = {},
  ): Promise<PaginatedResponse<DocumentReviewItemResponse>> => {
    const response = await api.get<PaginatedResponse<DocumentReviewItemResponse>>(
      '/admin/documents-review',
      { params: query },
    );
    return response.data;
  },
};
