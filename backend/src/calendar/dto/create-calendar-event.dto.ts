import { CalendarEventPriority, CalendarEventType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateCalendarEventDto {
  /** Если указан — событие привязано к заявке, иначе личное. */
  @IsOptional()
  @IsUUID()
  public applicationId?: string;

  @IsString()
  @Length(1, 300)
  public title!: string;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  public description?: string;

  @IsEnum(CalendarEventType)
  public type!: CalendarEventType;

  @IsDateString()
  public date!: string;

  @IsOptional()
  @IsEnum(CalendarEventPriority)
  public priority?: CalendarEventPriority;
}
