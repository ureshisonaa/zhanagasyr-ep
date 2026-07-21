import { AdmissionSeason } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryAdmissionCyclesDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  public year?: number;

  @IsOptional()
  @IsEnum(AdmissionSeason)
  public season?: AdmissionSeason;

  /** Учитывается только для Admin/SuperAdmin (см. AdmissionCyclesService.findAll) — иначе игнорируется. */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  public includeInactive?: boolean;
}
