import type { AiPrompt } from '@prisma/client';
import type { AiPromptResponse } from '../interfaces/ai-prompt-response.interface';

export function toAiPromptResponse(prompt: AiPrompt): AiPromptResponse {
  return {
    id: prompt.id,
    name: prompt.name,
    description: prompt.description,
    prompt: prompt.prompt,
    createdAt: prompt.createdAt,
    updatedAt: prompt.updatedAt,
  };
}
