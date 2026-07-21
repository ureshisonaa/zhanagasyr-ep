import { ApplicationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryApplicationsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ApplicationStatus)
  public applicationStatus?: ApplicationStatus;

  /**
   * Работает только для Mentor/Admin/SuperAdmin (просмотр глобального
   * списка). Student эту фильтрацию не контролирует — для него userId
   * в выборке всегда принудительно равен его собственному id
   * (см. ApplicationsService.findAllForUser).
   */
  @IsOptional()
  @IsUUID()
  public userId?: string;
}
