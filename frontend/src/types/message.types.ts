export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessageResponse {
  id: string;
  chatId: string;
  role: MessageRole;
  content: string;
  tokens: number | null;
  createdAt: string;
}

export interface ChatResponse {
  id: string;
  applicationId: string;
  title: string;
  messages: MessageResponse[];
  createdAt: string;
  updatedAt: string;
}
