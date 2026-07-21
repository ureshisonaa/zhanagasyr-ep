import { Injectable } from '@nestjs/common';
import type { DocumentStatus, Prisma } from '@prisma/client';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { PrismaService } from '../../prisma/prisma.service';
import type { QueryDocumentsReviewDto } from './dto/query-documents-review.dto';
import type { DocumentReviewItemResponse } from './interfaces/document-review-item-response.interface';
import { toDocumentReviewItemResponse } from './utils/to-document-review-item-response.util';

const DEFAULT_STATUS: DocumentStatus = 'NeedsReview';

/**
 * Roadmap, Этап 11.4: "очередь NeedsReview" — глобально, по всем студентам.
 * GET /documents (Этап 4.1) отдаёт только документы ВЫЗЫВАЮЩЕГО пользователя,
 * этого недостаточно для админской очереди. Само действие (одобрить/
 * отклонить) НЕ дублируется здесь — используется уже существующий
 * PUT /documents/:id/status (Этап 10.1), который уже синхронизирует
 * чек-лист при переходе в Approved.
 */
@Injectable()
export class DocumentsReviewService {
  public constructor(private readonly prisma: PrismaService) {}

  public async findAll(
    query: QueryDocumentsReviewDto,
  ): Promise<PaginatedResult<DocumentReviewItemResponse>> {
    const { page, limit, status } = query;

    const where: Prisma.DocumentWhereInput = { status: status ?? DEFAULT_STATUS };

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { uploadedAt: 'asc' },
        include: {
          user: { select: { firstName: true, lastName: true } },
          documentType: { select: { name: true } },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      items: items.map(toDocumentReviewItemResponse),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
