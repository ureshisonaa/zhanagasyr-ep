import { api } from './api';
import type { AiPromptResponse } from '../types/aiPrompt.types';

export interface AiPromptInput {
  name: string;
  description?: string;
  prompt: string;
}

export const aiPromptsApi = {
  getAll: async (): Promise<AiPromptResponse[]> => {
    const response = await api.get<{ success: true; prompts: AiPromptResponse[] }>('/ai-prompts');
    return response.data.prompts;
  },

  create: async (input: AiPromptInput): Promise<AiPromptResponse> => {
    const response = await api.post<{ success: true; prompt: AiPromptResponse }>(
      '/ai-prompts',
      input,
    );
    return response.data.prompt;
  },

  update: async (id: string, input: Partial<AiPromptInput>): Promise<AiPromptResponse> => {
    const response = await api.put<{ success: true; prompt: AiPromptResponse }>(
      `/ai-prompts/${id}`,
      input,
    );
    return response.data.prompt;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/ai-prompts/${id}`);
  },
};
