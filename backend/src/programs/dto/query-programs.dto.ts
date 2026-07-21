import { DegreeLevel } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryProgramsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  public universityId?: string;

  @IsOptional()
  @IsEnum(DegreeLevel)
  public degreeLevel?: DegreeLevel;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  public search?: string;

  /** Учитывается только для Admin/SuperAdmin (см. ProgramsService.findAll) — иначе игнорируется. */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  public includeInactive?: boolean;
}
