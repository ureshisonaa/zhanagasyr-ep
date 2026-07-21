import { api } from './api';
import type { ChatResponse } from '../types/message.types';

export const chatApi = {
  getByApplication: async (
    applicationId: string,
    limit = 50,
    before?: string,
  ): Promise<ChatResponse> => {
    const response = await api.get<{ success: true; chat: ChatResponse }>(
      `/chat/${applicationId}`,
      { params: { limit, before } },
    );
    return response.data.chat;
  },
};
