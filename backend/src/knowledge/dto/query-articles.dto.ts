import { KnowledgeCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryArticlesDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  public universityId?: string;

  @IsOptional()
  @IsEnum(KnowledgeCategory)
  public category?: KnowledgeCategory;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  public search?: string;
}
