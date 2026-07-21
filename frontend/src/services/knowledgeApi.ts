import { api } from './api';
import type { PaginatedResponse } from '../types/pagination.types';
import type { KnowledgeArticleResponse, KnowledgeCategory } from '../types/knowledgeArticle.types';

export interface KnowledgeArticlesQuery {
  page?: number;
  limit?: number;
  universityId?: string;
  category?: KnowledgeCategory;
  search?: string;
}

export interface KnowledgeArticleInput {
  universityId: string;
  title: string;
  category: KnowledgeCategory;
  content: string;
  source: string;
}

export const knowledgeApi = {
  getAll: async (
    query: KnowledgeArticlesQuery = {},
  ): Promise<PaginatedResponse<KnowledgeArticleResponse>> => {
    const response = await api.get<PaginatedResponse<KnowledgeArticleResponse>>('/knowledge', {
      params: query,
    });
    return response.data;
  },

  create: async (input: KnowledgeArticleInput): Promise<KnowledgeArticleResponse> => {
    const response = await api.post<{ success: true; article: KnowledgeArticleResponse }>(
      '/knowledge',
      input,
    );
    return response.data.article;
  },

  update: async (
    id: string,
    input: Partial<KnowledgeArticleInput>,
  ): Promise<KnowledgeArticleResponse> => {
    const response = await api.put<{ success: true; article: KnowledgeArticleResponse }>(
      `/knowledge/${id}`,
      input,
    );
    return response.data.article;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/knowledge/${id}`);
  },

  /** Roadmap, Этап 11.3: "кнопка переиндексировать" — повтор индексации без изменения содержимого. */
  reindex: async (id: string): Promise<KnowledgeArticleResponse> => {
    const response = await api.post<{ success: true; article: KnowledgeArticleResponse }>(
      `/knowledge/${id}/reindex`,
    );
    return response.data.article;
  },
};
