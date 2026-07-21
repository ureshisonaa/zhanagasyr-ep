import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { KnowledgeCategory, Prisma } from '@prisma/client';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateArticleDto } from './dto/create-article.dto';
import type { QueryArticlesDto } from './dto/query-articles.dto';
import type { UpdateArticleDto } from './dto/update-article.dto';
import type { KnowledgeArticleResponse } from './interfaces/knowledge-article-response.interface';
import { toKnowledgeArticleResponse } from './utils/to-knowledge-article-response.util';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  public async findAll(
    query: QueryArticlesDto,
  ): Promise<PaginatedResult<KnowledgeArticleResponse>> {
    const { page, limit, universityId, category, search } = query;

    const where: Prisma.KnowledgeBaseWhereInput = {
      ...(universityId ? { universityId } : {}),
      ...(category ? { category } : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.knowledgeBase.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.knowledgeBase.count({ where }),
    ]);

    return {
      items: items.map(toKnowledgeArticleResponse),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  public async findOne(id: string): Promise<KnowledgeArticleResponse> {
    const article = await this.prisma.knowledgeBase.findUnique({ where: { id } });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return toKnowledgeArticleResponse(article);
  }

  /**
   * Индексация в Qdrant не блокирует создание статьи: если Qdrant/OpenAI
   * временно недоступны, статья всё равно сохраняется в Postgres
   * (isIndexed: false) — Admin не должен терять свою работу из-за сбоя
   * внешнего сервиса. Отличается от подхода к загрузке документов
   * (Этап 4.2, где сбой Google Drive блокирует всю операцию): там сам
   * смысл запроса — "положить файл в Drive", здесь смысл — "сохранить
   * текст статьи", а индексация — вторичное усиление для AI-поиска.
   */
  public async create(dto: CreateArticleDto): Promise<KnowledgeArticleResponse> {
    await this.ensureUniversityExists(dto.universityId);
    const article = await this.prisma.knowledgeBase.create({ data: dto });
    return this.indexAndReturn(article.id, dto.universityId, dto.category, dto.title, dto.content);
  }

  public async update(id: string, dto: UpdateArticleDto): Promise<KnowledgeArticleResponse> {
    await this.ensureArticleExists(id);

    if (dto.universityId) {
      await this.ensureUniversityExists(dto.universityId);
    }

    const article = await this.prisma.knowledgeBase.update({ where: { id }, data: dto });

    // article.content уже отражает актуальное содержимое после update()
    // независимо от того, было ли поле content в dto — отдельный fetch
    // "старого" содержимого не нужен.
    return this.indexAndReturn(
      article.id,
      article.universityId,
      article.category,
      article.title,
      article.content,
    );
  }

  /** Настоящее удаление — на KnowledgeBase ничего не ссылается по FK. Удаляет и векторы из Qdrant. */
  /**
   * Ручная переиндексация (Этап 11.3, Roadmap: "кнопка переиндексировать").
   * create/update уже индексируют автоматически, но делают это без блокировки
   * сохранения — если Qdrant/OpenAI были временно недоступны, статья
   * осталась бы с isIndexed=false без явного способа повторить попытку, не
   * трогая содержимое (искусственный no-op update() ради переиндексации —
   * не тот способ, который стоит поддерживать как основной).
   */
  public async reindex(id: string): Promise<KnowledgeArticleResponse> {
    const article = await this.ensureArticleExists(id);
    return this.indexAndReturn(article.id, article.universityId, article.category, article.title, article.content);
  }

  public async remove(id: string): Promise<void> {
    await this.ensureArticleExists(id);
    await this.prisma.knowledgeBase.delete({ where: { id } });

    try {
      await this.embeddingsService.deleteArticleVectors(id);
    } catch (error) {
      // Статья уже удалена из Postgres — не откатываем это из-за сбоя
      // Qdrant; осиротевшие векторы не отображаются ни в одном API поверх
      // Postgres, но идеально было бы почистить их при следующей
      // успешной операции с Qdrant (не реализовано — не критично для MVP).
      this.logger.warn(`Failed to delete Qdrant vectors for article ${id}: ${String(error)}`);
    }
  }

  private async indexAndReturn(
    articleId: string,
    universityId: string,
    category: string,
    title: string,
    content: string,
  ): Promise<KnowledgeArticleResponse> {
    try {
      const embeddingId = await this.embeddingsService.indexArticle(
        articleId,
        universityId,
        category,
        title,
        content,
      );
      const updated = await this.prisma.knowledgeBase.update({
        where: { id: articleId },
        data: { embeddingId },
      });
      return toKnowledgeArticleResponse(updated);
    } catch (error) {
      this.logger.warn(`Failed to index article ${articleId} in Qdrant: ${String(error)}`);
      const fallback = await this.prisma.knowledgeBase.findUniqueOrThrow({ where: { id: articleId } });
      return toKnowledgeArticleResponse(fallback);
    }
  }

  private async ensureUniversityExists(id: string): Promise<void> {
    const exists = await this.prisma.university.findUnique({ where: { id } });

    if (!exists) {
      throw new NotFoundException('University not found');
    }
  }

  private async ensureArticleExists(id: string): Promise<{
    id: string;
    universityId: string;
    category: KnowledgeCategory;
    title: string;
    content: string;
  }> {
    const article = await this.prisma.knowledgeBase.findUnique({ where: { id } });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return article;
  }
}
