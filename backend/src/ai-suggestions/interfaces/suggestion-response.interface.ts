export type SuggestionKind = 'dynamic' | 'stored';

export interface SuggestionResponse {
  id: string;
  kind: SuggestionKind;
  title: string;
  content: string;
  /** null для динамических — они не персистятся, у них нет момента создания в БД. */
  createdAt: Date | null;
}
