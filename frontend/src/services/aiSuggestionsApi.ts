import { api } from './api';
import type { SuggestionResponse } from '../types/suggestion.types';

export const aiSuggestionsApi = {
  getAllForApplication: async (applicationId: string): Promise<SuggestionResponse[]> => {
    const response = await api.get<{ success: true; suggestions: SuggestionResponse[] }>(
      `/ai-suggestions/${applicationId}`,
    );
    return response.data.suggestions;
  },

  generate: async (applicationId: string): Promise<SuggestionResponse> => {
    const response = await api.post<{ success: true; suggestion: SuggestionResponse }>(
      `/ai-suggestions/${applicationId}/generate`,
    );
    return response.data.suggestion;
  },

  dismiss: async (id: string): Promise<void> => {
    await api.put(`/ai-suggestions/${id}/dismiss`);
  },
};
