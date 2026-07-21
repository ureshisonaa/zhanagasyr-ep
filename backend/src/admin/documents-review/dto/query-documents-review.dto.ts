import { DocumentStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryDocumentsReviewDto extends PaginationQueryDto {
  /** По умолчанию — NeedsReview (см. DocumentsReviewService.findAll). */
  @IsOptional()
  @IsEnum(DocumentStatus)
  public status?: DocumentStatus;
}
