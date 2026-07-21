import type { MessageResponse } from './message-response.interface';

export interface ChatResponse {
  id: string;
  applicationId: string;
  title: string;
  messages: MessageResponse[];
  createdAt: Date;
  updatedAt: Date;
}
