import { api } from './api';
import type { MessageResponse } from '../types/message.types';

export interface AiChatResult {
  userMessage: MessageResponse;
  assistantMessage: MessageResponse;
}

export const aiApi = {
  sendMessage: async (applicationId: string, message: string): Promise<AiChatResult> => {
    const response = await api.post<{ success: true } & AiChatResult>('/ai/chat', {
      applicationId,
      message,
    });
    return { userMessage: response.data.userMessage, assistantMessage: response.data.assistantMessage };
  },
};
