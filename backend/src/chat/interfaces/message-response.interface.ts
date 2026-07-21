export interface MessageResponse {
  id: string;
  chatId: string;
  role: string;
  content: string;
  tokens: number | null;
  createdAt: Date;
}
