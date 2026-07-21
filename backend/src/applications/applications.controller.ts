import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { QueryApplicationsDto } from './dto/query-applications.dto';
import { UpdateApplicationStatusDto } from './dto/update-status.dto';
import type { ApplicationResponse } from './interfaces/application-response.interface';

/**
 * Ни один роут здесь не помечен @Public() — заявки это персональные данные,
 * а не публичный каталог (в отличие от Universities/Programs). Глобальный
 * JwtAccessGuard уже требует аутентификации по умолчанию.
 *
 * RolesGuard/@Roles тоже не используется: контроль доступа здесь не
 * "только роль X может Y", а "владелец ИЛИ роль с глобальным доступом" —
 * такая логика принадлежит сервису, а не декларативному guard'у.
 */
@Controller('applications')
export class ApplicationsController {
  public constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  public async create(
    @CurrentUser() user: SanitizedUser,
    @Body() dto: CreateApplicationDto,
  ): Promise<{ success: true; application: ApplicationResponse }> {
    const application = await this.applicationsService.create(user.id, dto);
    return { success: true, application };
  }

  @Get()
  public async findAll(
    @CurrentUser() user: SanitizedUser,
    @Query() query: QueryApplicationsDto,
  ): Promise<{ success: true } & PaginatedResult<ApplicationResponse>> {
    const result = await this.applicationsService.findAllForUser(user, query);
    return { success: true, ...result };
  }

  @Get(':id')
  public async findOne(
    @CurrentUser() user: SanitizedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true; application: ApplicationResponse }> {
    const application = await this.applicationsService.findOneForUser(user, id);
    return { success: true, application };
  }

  @Put(':id/status')
  public async updateStatus(
    @CurrentUser() user: SanitizedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ): Promise<{ success: true; application: ApplicationResponse }> {
    const application = await this.applicationsService.updateStatus(user, id, dto);
    return { success: true, application };
  }
}
