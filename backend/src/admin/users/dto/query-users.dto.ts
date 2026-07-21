import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ALL_ROLE_NAMES } from '../../../common/constants/roles.constant';

export class QueryUsersDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(ALL_ROLE_NAMES)
  public role?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  public isActive?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  public search?: string;
}
