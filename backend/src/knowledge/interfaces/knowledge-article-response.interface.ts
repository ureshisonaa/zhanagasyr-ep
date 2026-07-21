import type { KnowledgeCategory } from '@prisma/client';

export interface KnowledgeArticleResponse {
  id: string;
  universityId: string;
  title: string;
  category: KnowledgeCategory;
  content: string;
  source: string;
  /** Производное от embeddingId — сам ID вектора Qdrant наружу не отдаётся. */
  isIndexed: boolean;
  createdAt: Date;
  updatedAt: Date;
}
