import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { SanitizedUser } from '../../auth/interfaces/sanitized-user.interface';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { AdminUsersService } from './admin-users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import type { AdminUserResponse } from './interfaces/admin-user-response.interface';

/**
 * Только Admin/SuperAdmin — управление пользователями более
 * чувствительная операция, чем обычный GLOBAL_READ_ROLES-доступ Mentor
 * к заявкам: Mentor намеренно НЕ имеет доступа к этому контроллеру.
 */
@Roles('Admin', 'SuperAdmin')
@UseGuards(RolesGuard)
@Controller('admin/users')
export class AdminUsersController {
  public constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  public async findAll(
    @Query() query: QueryUsersDto,
  ): Promise<{ success: true } & PaginatedResult<AdminUserResponse>> {
    const result = await this.adminUsersService.findAll(query);
    return { success: true, ...result };
  }

  @Post()
  public async create(
    @CurrentUser() user: SanitizedUser,
    @Body() dto: CreateUserDto,
  ): Promise<{ success: true; user: AdminUserResponse }> {
    const created = await this.adminUsersService.create(user, dto);
    return { success: true, user: created };
  }

  @Put(':id/role')
  public async updateRole(
    @CurrentUser() user: SanitizedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<{ success: true; user: AdminUserResponse }> {
    const updated = await this.adminUsersService.updateRole(user, id, dto);
    return { success: true, user: updated };
  }

  @HttpCode(HttpStatus.OK)
  @Put(':id/deactivate')
  public async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true; user: AdminUserResponse }> {
    const updated = await this.adminUsersService.setActive(id, false);
    return { success: true, user: updated };
  }

  @HttpCode(HttpStatus.OK)
  @Put(':id/activate')
  public async activate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true; user: AdminUserResponse }> {
    const updated = await this.adminUsersService.setActive(id, true);
    return { success: true, user: updated };
  }
}
