export interface KnowledgeSearchResult {
  articleId: string;
  title: string;
  text: string;
  score: number;
}

export interface KnowledgeSearchOptions {
  universityId?: string;
  limit?: number;
}
