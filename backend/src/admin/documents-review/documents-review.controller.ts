import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { DocumentsReviewService } from './documents-review.service';
import { QueryDocumentsReviewDto } from './dto/query-documents-review.dto';
import type { DocumentReviewItemResponse } from './interfaces/document-review-item-response.interface';

const ADMIN_ROLES = ['Admin', 'SuperAdmin'];

/** Только Admin/SuperAdmin — глобальный обзор по всем студентам, не сценарий Mentor. */
@Roles(...ADMIN_ROLES)
@UseGuards(RolesGuard)
@Controller('admin/documents-review')
export class DocumentsReviewController {
  public constructor(private readonly documentsReviewService: DocumentsReviewService) {}

  @Get()
  public async findAll(
    @Query() query: QueryDocumentsReviewDto,
  ): Promise<{ success: true } & PaginatedResult<DocumentReviewItemResponse>> {
    const result = await this.documentsReviewService.findAll(query);
    return { success: true, ...result };
  }
}
