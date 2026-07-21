import type { MessageResponse } from '../../chat/interfaces/message-response.interface';

export interface AiChatResponse {
  userMessage: MessageResponse;
  assistantMessage: MessageResponse;
}
