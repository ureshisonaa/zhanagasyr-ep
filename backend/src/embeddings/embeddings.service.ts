import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { randomUUID } from 'crypto';
import type { QdrantConfig } from '../config/qdrant.config';
import { OpenAiService } from '../openai/openai.service';
import type {
  KnowledgeSearchOptions,
  KnowledgeSearchResult,
} from './interfaces/knowledge-search-result.interface';
import { chunkText } from './utils/chunk-text.util';

const COLLECTION_NAME = 'knowledge_base';
// Размерность vector-выхода text-embedding-3-small (значение по умолчанию
// в openai.config.ts). При смене OPENAI_EMBEDDING_MODEL на модель с другой
// размерностью эту константу нужно обновить вручную — известное
// ограничение, не критично для одной статической модели в конфигурации.
const EMBEDDING_VECTOR_SIZE = 1536;

/**
 * Без контроллера — тот же принцип, что и GoogleDriveModule/OpenAiModule:
 * Qdrant используется только внутренне, сначала KnowledgeService (эта же
 * фаза), затем Prompt Builder (Этап 5.5) для поиска релевантного контекста.
 */
@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly qdrant: QdrantClient;
  private collectionEnsured = false;

  public constructor(
    private readonly configService: ConfigService,
    private readonly openAiService: OpenAiService,
  ) {
    const config = this.configService.get<QdrantConfig>('qdrant');
    this.qdrant = new QdrantClient({
      url: config?.url ?? 'http://localhost:6333',
      apiKey: config?.apiKey,
    });
  }

  /**
   * Разбивает статью на чанки, создаёт embeddings, отправляет в Qdrant.
   * Переиндексация "по умолчанию": сначала удаляет уже существующие
   * векторы этой статьи (по фильтру payload.articleId — см. класс-докстринг
   * о том, почему не по хранимым ID точек), затем создаёт новые.
   *
   * Возвращает маркер индексации (UUID, не привязанный к конкретной точке)
   * для записи в KnowledgeBase.embeddingId — реальный источник истины по
   * векторам одной статьи это Qdrant (фильтр по articleId), а не Postgres.
   */
  public async indexArticle(
    articleId: string,
    universityId: string,
    category: string,
    title: string,
    content: string,
  ): Promise<string> {
    await this.ensureCollection();
    await this.deleteArticleVectors(articleId);

    const chunks = chunkText(content);

    if (chunks.length === 0) {
      return randomUUID();
    }

    const points = [];

    for (let index = 0; index < chunks.length; index += 1) {
      // Намеренно последовательно, не Promise.all — избегаем всплеска
      // параллельных запросов к OpenAI Embeddings API при длинных статьях
      // (rate limit, Этап 5.1).
      const vector = await this.openAiService.createEmbedding(chunks[index]);
      points.push({
        id: randomUUID(),
        vector,
        payload: { articleId, universityId, category, title, chunkIndex: index, text: chunks[index] },
      });
    }

    await this.qdrant.upsert(COLLECTION_NAME, { points });

    return randomUUID();
  }

  /** Вызывается отдельно при удалении статьи (KnowledgeService.remove). */
  public async deleteArticleVectors(articleId: string): Promise<void> {
    await this.ensureCollection();

    await this.qdrant.delete(COLLECTION_NAME, {
      filter: { must: [{ key: 'articleId', match: { value: articleId } }] },
    });
  }

  /**
   * Семантический поиск — используется Prompt Builder (Этап 5.5), не
   * вызывается напрямую из этого этапа (нет контроллера, некому вызывать
   * снаружи). Оставлен здесь как готовая, протестированная по структуре
   * точка входа.
   */
  public async search(
    queryText: string,
    options?: KnowledgeSearchOptions,
  ): Promise<KnowledgeSearchResult[]> {
    await this.ensureCollection();

    const vector = await this.openAiService.createEmbedding(queryText);
    const filter = options?.universityId
      ? { must: [{ key: 'universityId', match: { value: options.universityId } }] }
      : undefined;

    const results = await this.qdrant.search(COLLECTION_NAME, {
      vector,
      limit: options?.limit ?? 5,
      filter,
      with_payload: true,
    });

    return results.map((result) => ({
      articleId: String(result.payload?.articleId ?? ''),
      title: String(result.payload?.title ?? ''),
      text: String(result.payload?.text ?? ''),
      score: result.score,
    }));
  }

  private async ensureCollection(): Promise<void> {
    if (this.collectionEnsured) {
      return;
    }

    try {
      await this.qdrant.getCollection(COLLECTION_NAME);
    } catch {
      this.logger.log(`Creating Qdrant collection "${COLLECTION_NAME}"`);
      await this.qdrant.createCollection(COLLECTION_NAME, {
        vectors: { size: EMBEDDING_VECTOR_SIZE, distance: 'Cosine' },
      });
    }

    this.collectionEnsured = true;
  }
}
