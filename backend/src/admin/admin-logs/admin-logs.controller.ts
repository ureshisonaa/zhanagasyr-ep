import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { AdminLogsService } from './admin-logs.service';
import { QueryAdminLogsDto } from './dto/query-admin-logs.dto';
import type { AdminLogEntryResponse } from './interfaces/admin-log-entry-response.interface';

const ADMIN_ROLES = ['Admin', 'SuperAdmin'];

/**
 * Не названо явно в файловом списке Roadmap (там указан только сам
 * интерсептор) — минимальная сопутствующая часть для чтения: аудит,
 * который нельзя посмотреть, не выполняет своей цели.
 */
@Roles(...ADMIN_ROLES)
@UseGuards(RolesGuard)
@Controller('admin/logs')
export class AdminLogsController {
  public constructor(private readonly adminLogsService: AdminLogsService) {}

  @Get()
  public async findAll(
    @Query() query: QueryAdminLogsDto,
  ): Promise<{ success: true } & PaginatedResult<AdminLogEntryResponse>> {
    const result = await this.adminLogsService.findAll(query);
    return { success: true, ...result };
  }
}
