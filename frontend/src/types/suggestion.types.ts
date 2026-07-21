export type SuggestionKind = 'dynamic' | 'stored';

export interface SuggestionResponse {
  id: string;
  kind: SuggestionKind;
  title: string;
  content: string;
  createdAt: string | null;
}
