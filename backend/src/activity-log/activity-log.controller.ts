import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { ActivityLogService } from './activity-log.service';
import { QueryActivityLogDto } from './dto/query-activity-log.dto';
import type { ActivityLogEntryResponse } from './interfaces/activity-log-entry-response.interface';

/** Нет POST — запись только внутренняя (ActivityLogService.log), вызывается другими сервисами. */
@Controller('activity-log')
export class ActivityLogController {
  public constructor(private readonly activityLogService: ActivityLogService) {}

  @Get(':applicationId')
  public async findAll(
    @CurrentUser() user: SanitizedUser,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Query() query: QueryActivityLogDto,
  ): Promise<{ success: true; entries: ActivityLogEntryResponse[] }> {
    const entries = await this.activityLogService.findAllForUser(user, applicationId, query.limit);
    return { success: true, entries };
  }
}
