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
import { AdmissionCyclesService } from './admission-cycles.service';
import { CreateAdmissionCycleDto } from './dto/create-admission-cycle.dto';
import { QueryAdmissionCyclesDto } from './dto/query-admission-cycles.dto';
import { UpdateAdmissionCycleDto } from './dto/update-admission-cycle.dto';
import type { AdmissionCycleResponse } from './interfaces/admission-cycle-response.interface';

const ADMIN_ROLES = ['Admin', 'SuperAdmin'];

/** См. комментарий в UniversitiesController — @Public() убран с чтения по той же причине (Этап 11.2). */
@Controller('admission-cycles')
export class AdmissionCyclesController {
  public constructor(private readonly admissionCyclesService: AdmissionCyclesService) {}

  @Get()
  public async findAll(
    @CurrentUser() user: SanitizedUser,
    @Query() query: QueryAdmissionCyclesDto,
  ): Promise<{ success: true } & PaginatedResult<AdmissionCycleResponse>> {
    const result = await this.admissionCyclesService.findAll(query, user);
    return { success: true, ...result };
  }

  @Get(':id')
  public async findOne(
    @CurrentUser() user: SanitizedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true; admissionCycle: AdmissionCycleResponse }> {
    const admissionCycle = await this.admissionCyclesService.findOne(id, user);
    return { success: true, admissionCycle };
  }

  @Roles(...ADMIN_ROLES)
  @UseGuards(RolesGuard)
  @Post()
  public async create(
    @Body() dto: CreateAdmissionCycleDto,
  ): Promise<{ success: true; admissionCycle: AdmissionCycleResponse }> {
    const admissionCycle = await this.admissionCyclesService.create(dto);
    return { success: true, admissionCycle };
  }

  @Roles(...ADMIN_ROLES)
  @UseGuards(RolesGuard)
  @Put(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdmissionCycleDto,
  ): Promise<{ success: true; admissionCycle: AdmissionCycleResponse }> {
    const admissionCycle = await this.admissionCyclesService.update(id, dto);
    return { success: true, admissionCycle };
  }

  @Roles(...ADMIN_ROLES)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: true }> {
    await this.admissionCyclesService.softDelete(id);
    return { success: true };
  }
}
