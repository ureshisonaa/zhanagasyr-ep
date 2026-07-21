import type { KnowledgeBase } from '@prisma/client';
import type { KnowledgeArticleResponse } from '../interfaces/knowledge-article-response.interface';

export function toKnowledgeArticleResponse(article: KnowledgeBase): KnowledgeArticleResponse {
  return {
    id: article.id,
    universityId: article.universityId,
    title: article.title,
    category: article.category,
    content: article.content,
    source: article.source,
    isIndexed: article.embeddingId !== null,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
  };
}
