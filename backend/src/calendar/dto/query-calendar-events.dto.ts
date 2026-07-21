import { CalendarEventType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryCalendarEventsDto extends PaginationQueryDto {
  /** Без этого фильтра — общий список (все свои события, личные и по заявкам). */
  @IsOptional()
  @IsUUID()
  public applicationId?: string;

  @IsOptional()
  @IsEnum(CalendarEventType)
  public type?: CalendarEventType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  public completed?: boolean;
}
