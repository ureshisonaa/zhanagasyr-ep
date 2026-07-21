import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { QueryCalendarEventsDto } from './dto/query-calendar-events.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import type { CalendarEventResponse } from './interfaces/calendar-event-response.interface';

/**
 * Ни один роут не публичен — календарь персональный. RolesGuard/@Roles не
 * используется: доступ здесь не "только роль X", а "владелец ИЛИ роль с
 * глобальным доступом, и только для событий заявки" — такая логика
 * принадлежит сервису (тот же принцип, что Applications/Checklists/Chat).
 */
@Controller('calendar')
export class CalendarController {
  public constructor(private readonly calendarService: CalendarService) {}

  @Post()
  public async create(
    @CurrentUser() user: SanitizedUser,
    @Body() dto: CreateCalendarEventDto,
  ): Promise<{ success: true; event: CalendarEventResponse }> {
    const event = await this.calendarService.create(user, dto);
    return { success: true, event };
  }

  @Get()
  public async findAll(
    @CurrentUser() user: SanitizedUser,
    @Query() query: QueryCalendarEventsDto,
  ): Promise<{ success: true } & PaginatedResult<CalendarEventResponse>> {
    const result = await this.calendarService.findAll(user, query);
    return { success: true, ...result };
  }

  @Get(':id')
  public async findOne(
    @CurrentUser() user: SanitizedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true; event: CalendarEventResponse }> {
    const event = await this.calendarService.findOne(user, id);
    return { success: true, event };
  }

  @Put(':id')
  public async update(
    @CurrentUser() user: SanitizedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCalendarEventDto,
  ): Promise<{ success: true; event: CalendarEventResponse }> {
    const event = await this.calendarService.update(user, id, dto);
    return { success: true, event };
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async remove(
    @CurrentUser() user: SanitizedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    await this.calendarService.remove(user, id);
    return { success: true };
  }
}
