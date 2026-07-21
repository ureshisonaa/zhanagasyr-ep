import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { CalendarEvent, Prisma } from '@prisma/client';
import { ActivityLogService } from '../activity-log/activity-log.service';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { GLOBAL_READ_ROLES } from '../common/constants/roles.constant';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import type { QueryCalendarEventsDto } from './dto/query-calendar-events.dto';
import type { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import type { CalendarEventResponse } from './interfaces/calendar-event-response.interface';
import { toCalendarEventResponse } from './utils/to-calendar-event-response.util';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /**
   * Если applicationId указан — событие принадлежит ВЛАДЕЛЬЦУ заявки
   * (application.userId), а не обязательно тому, кто его создаёт: так
   * Mentor может добавить, например, дату интервью в календарь студента
   * (решение по правам Mentor: "может добавлять и редактировать события
   * календаря"). Без applicationId — личное событие, всегда принадлежит
   * создателю; Mentor не может создавать личные события за студента —
   * личный календарь строго приватен, даже для ролей с глобальным чтением.
   */
  public async create(
    currentUser: SanitizedUser,
    dto: CreateCalendarEventDto,
  ): Promise<CalendarEventResponse> {
    let ownerUserId = currentUser.id;

    if (dto.applicationId) {
      const application = await this.prisma.application.findUnique({
        where: { id: dto.applicationId },
      });

      if (!application) {
        throw new NotFoundException('Application not found');
      }

      const isOwner = application.userId === currentUser.id;
      const hasGlobalWrite = GLOBAL_READ_ROLES.includes(currentUser.role);

      if (!isOwner && !hasGlobalWrite) {
        throw new ForbiddenException('You do not have access to this application');
      }

      ownerUserId = application.userId;
    }

    const event = await this.prisma.calendarEvent.create({
      data: {
        userId: ownerUserId,
        applicationId: dto.applicationId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        date: new Date(dto.date),
        priority: dto.priority ?? 'Medium',
      },
    });

    // Личные события (без applicationId) не логируются — журнал действий
    // привязан к заявке, а не к пользователю в целом.
    if (dto.applicationId) {
      try {
        await this.activityLogService.log(
          dto.applicationId,
          currentUser.id,
          'CalendarEventCreated',
          `Добавлено событие «${event.title}» (${new Date(event.date).toLocaleDateString('ru-RU')})`,
        );
      } catch (logError) {
        this.logger.warn(`Failed to write activity log for calendar event creation: ${String(logError)}`);
      }
    }

    return toCalendarEventResponse(event);
  }

  /**
   * Без applicationId — всегда только СВОИ события (личные и по своим
   * заявкам), даже для Mentor/Admin: "общий список" не означает "все
   * события всех пользователей". С applicationId — события конкретной
   * заявки, доступной владельцу или роли с глобальным доступом.
   */
  public async findAll(
    currentUser: SanitizedUser,
    query: QueryCalendarEventsDto,
  ): Promise<PaginatedResult<CalendarEventResponse>> {
    const { page, limit, applicationId, type, completed } = query;

    const where: Prisma.CalendarEventWhereInput = {};

    if (applicationId) {
      await this.ensureApplicationAccessible(currentUser, applicationId);
      where.applicationId = applicationId;
    } else {
      where.userId = currentUser.id;
    }

    if (type) {
      where.type = type;
    }

    if (completed !== undefined) {
      where.completed = completed;
    }

    const [items, total] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'asc' },
      }),
      this.prisma.calendarEvent.count({ where }),
    ]);

    return {
      items: items.map(toCalendarEventResponse),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  public async findOne(currentUser: SanitizedUser, id: string): Promise<CalendarEventResponse> {
    const event = await this.findEventOrThrow(id);
    this.ensureCanAccess(currentUser, event);
    return toCalendarEventResponse(event);
  }

  public async update(
    currentUser: SanitizedUser,
    id: string,
    dto: UpdateCalendarEventDto,
  ): Promise<CalendarEventResponse> {
    const event = await this.findEventOrThrow(id);
    this.ensureCanAccess(currentUser, event);

    const updated = await this.prisma.calendarEvent.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        date: dto.date ? new Date(dto.date) : undefined,
        priority: dto.priority,
        completed: dto.completed,
      },
    });

    if (updated.applicationId) {
      try {
        await this.activityLogService.log(
          updated.applicationId,
          currentUser.id,
          'CalendarEventUpdated',
          `Обновлено событие «${updated.title}» (${new Date(updated.date).toLocaleDateString('ru-RU')})`,
        );
      } catch (logError) {
        this.logger.warn(`Failed to write activity log for calendar event update: ${String(logError)}`);
      }
    }

    return toCalendarEventResponse(updated);
  }

  /**
   * Строже, чем ensureCanAccess: решение по правам Mentor разрешает только
   * "добавлять и редактировать события календаря" — удаление нигде не
   * упоминалось ни для одного ресурса (ни чек-листа, ни документов, ни
   * календаря). Удаление — либо владелец, либо Admin/SuperAdmin как общая
   * административная функция, но не Mentor.
   */
  public async remove(currentUser: SanitizedUser, id: string): Promise<void> {
    const event = await this.findEventOrThrow(id);
    this.ensureCanDelete(currentUser, event);
    await this.prisma.calendarEvent.delete({ where: { id } });
  }

  private async findEventOrThrow(id: string): Promise<CalendarEvent> {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id } });

    if (!event) {
      throw new NotFoundException('Calendar event not found');
    }

    return event;
  }

  /**
   * Личное событие (applicationId = null) — доступ строго только владельцу,
   * даже для Mentor/Admin. Событие заявки — владельцу или роли с глобальным
   * доступом (тот же принцип, что и на создании).
   */
  private ensureCanAccess(currentUser: SanitizedUser, event: CalendarEvent): void {
    if (event.userId === currentUser.id) {
      return;
    }

    if (event.applicationId !== null && GLOBAL_READ_ROLES.includes(currentUser.role)) {
      return;
    }

    throw new ForbiddenException('You do not have access to this calendar event');
  }

  private async ensureApplicationAccessible(
    currentUser: SanitizedUser,
    applicationId: string,
  ): Promise<void> {
    const application = await this.prisma.application.findUnique({ where: { id: applicationId } });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.userId !== currentUser.id && !GLOBAL_READ_ROLES.includes(currentUser.role)) {
      throw new ForbiddenException('You do not have access to this application');
    }
  }

  private ensureCanDelete(currentUser: SanitizedUser, event: CalendarEvent): void {
    const ADMIN_ROLES = ['Admin', 'SuperAdmin'];

    if (event.userId === currentUser.id || ADMIN_ROLES.includes(currentUser.role)) {
      return;
    }

    throw new ForbiddenException('Only the owner or an administrator can delete this calendar event');
  }
}
