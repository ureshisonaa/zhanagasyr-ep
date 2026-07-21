export interface AiPromptResponse {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  createdAt: string;
  updatedAt: string;
}
