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
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { CreateUniversityDto } from './dto/create-university.dto';
import { QueryUniversitiesDto } from './dto/query-universities.dto';
import { UpdateUniversityDto } from './dto/update-university.dto';
import type { UniversityResponse } from './interfaces/university-response.interface';
import { UniversitiesService } from './universities.service';

const ADMIN_ROLES = ['Admin', 'SuperAdmin'];

/**
 * Роуты чтения БОЛЬШЕ не @Public() (Этап 11.2) — платформа закрытая, весь
 * frontend и так работает только под авторизацией (ProtectedRoute
 * оборачивает всё, кроме /login), поэтому анонимный доступ сюда никогда
 * не был практически нужен. Убрано намеренно: @Public() полностью
 * пропускает выполнение JWT-стратегии (см. JwtAccessGuard) — на публичном
 * роуте req.user НЕ заполняется даже для залогиненного Admin, а значит
 * "Admin видит деактивированные записи" было бы невозможно реализовать,
 * оставив роут публичным.
 */
@Controller('universities')
export class UniversitiesController {
  public constructor(private readonly universitiesService: UniversitiesService) {}

  @Get()
  public async findAll(
    @CurrentUser() user: SanitizedUser,
    @Query() query: QueryUniversitiesDto,
  ): Promise<{ success: true } & PaginatedResult<UniversityResponse>> {
    const result = await this.universitiesService.findAll(query, user);
    return { success: true, ...result };
  }

  @Get(':id')
  public async findOne(
    @CurrentUser() user: SanitizedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true; university: UniversityResponse }> {
    const university = await this.universitiesService.findOne(id, user);
    return { success: true, university };
  }

  @Roles(...ADMIN_ROLES)
  @UseGuards(RolesGuard)
  @Post()
  public async create(
    @Body() dto: CreateUniversityDto,
  ): Promise<{ success: true; university: UniversityResponse }> {
    const university = await this.universitiesService.create(dto);
    return { success: true, university };
  }

  @Roles(...ADMIN_ROLES)
  @UseGuards(RolesGuard)
  @Put(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUniversityDto,
  ): Promise<{ success: true; university: UniversityResponse }> {
    const university = await this.universitiesService.update(id, dto);
    return { success: true, university };
  }

  @Roles(...ADMIN_ROLES)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: true }> {
    await this.universitiesService.softDelete(id);
    return { success: true };
  }
}
