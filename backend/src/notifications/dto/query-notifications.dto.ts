import { NotificationType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryNotificationsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(NotificationType)
  public type?: NotificationType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  public isRead?: boolean;
}
