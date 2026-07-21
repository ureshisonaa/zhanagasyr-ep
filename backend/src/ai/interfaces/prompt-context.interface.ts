import type { KnowledgeSearchResult } from '../../embeddings/interfaces/knowledge-search-result.interface';

export interface PromptDocumentInfo {
  fileName: string;
  documentTypeName: string;
  status: string;
}

export interface PromptHistoryMessage {
  role: string;
  content: string;
}

export interface PromptContext {
  user: { firstName: string; lastName: string };
  university: { name: string; city: string; country: string };
  program: { name: string; degreeLevel: string };
  currentStageLabel: string;
  documents: PromptDocumentInfo[];
  knowledgeResults: KnowledgeSearchResult[];
  history: PromptHistoryMessage[];
  userMessage: string;
}
