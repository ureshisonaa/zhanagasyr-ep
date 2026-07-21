export interface AiPromptResponse {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  createdAt: Date;
  updatedAt: Date;
}
