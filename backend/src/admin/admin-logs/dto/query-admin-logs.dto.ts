import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryAdminLogsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  public adminId?: string;
}
