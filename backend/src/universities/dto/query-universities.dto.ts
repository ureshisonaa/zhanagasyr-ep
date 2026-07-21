import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryUniversitiesDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  public search?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  public country?: string;

  /** Учитывается только для Admin/SuperAdmin (см. UniversitiesService.findAll) — иначе игнорируется. */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  public includeInactive?: boolean;
}
