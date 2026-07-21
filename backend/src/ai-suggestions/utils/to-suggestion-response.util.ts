import type { AiSuggestion } from '@prisma/client';
import type { SuggestionResponse } from '../interfaces/suggestion-response.interface';

export function toStoredSuggestionResponse(suggestion: AiSuggestion): SuggestionResponse {
  return {
    id: suggestion.id,
    kind: 'stored',
    title: suggestion.title,
    content: suggestion.content,
    createdAt: suggestion.createdAt,
  };
}
