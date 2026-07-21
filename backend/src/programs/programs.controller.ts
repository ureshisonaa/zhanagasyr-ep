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
import { CreateProgramRequirementDto } from './dto/create-program-requirement.dto';
import { CreateProgramDto } from './dto/create-program.dto';
import { QueryProgramsDto } from './dto/query-programs.dto';
import { UpdateProgramRequirementDto } from './dto/update-program-requirement.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import type { ProgramRequirementResponse } from './interfaces/program-requirement-response.interface';
import type { ProgramResponse } from './interfaces/program-response.interface';
import { ProgramsService } from './programs.service';

const ADMIN_ROLES = ['Admin', 'SuperAdmin'];

/** См. комментарий в UniversitiesController — @Public() убран с чтения по той же причине (Этап 11.2). */
@Controller('programs')
export class ProgramsController {
  public constructor(private readonly programsService: ProgramsService) {}

  @Get()
  public async findAll(
    @CurrentUser() user: SanitizedUser,
    @Query() query: QueryProgramsDto,
  ): Promise<{ success: true } & PaginatedResult<ProgramResponse>> {
    const result = await this.programsService.findAll(query, user);
    return { success: true, ...result };
  }

  @Get(':id')
  public async findOne(
    @CurrentUser() user: SanitizedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true; program: ProgramResponse }> {
    const program = await this.programsService.findOne(id, user);
    return { success: true, program };
  }

  @Roles(...ADMIN_ROLES)
  @UseGuards(RolesGuard)
  @Post()
  public async create(
    @Body() dto: CreateProgramDto,
  ): Promise<{ success: true; program: ProgramResponse }> {
    const program = await this.programsService.create(dto);
    return { success: true, program };
  }

  @Roles(...ADMIN_ROLES)
  @UseGuards(RolesGuard)
  @Put(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgramDto,
  ): Promise<{ success: true; program: ProgramResponse }> {
    const program = await this.programsService.update(id, dto);
    return { success: true, program };
  }

  @Roles(...ADMIN_ROLES)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: true }> {
    await this.programsService.softDelete(id);
    return { success: true };
  }

  // -------------------------------------------------------------------
  // Вложенный ресурс: /programs/:id/requirements
  // -------------------------------------------------------------------

  @Get(':id/requirements')
  public async findRequirements(
    @Param('id', ParseUUIDPipe) programId: string,
  ): Promise<{ success: true; requirements: ProgramRequirementResponse[] }> {
    const requirements = await this.programsService.findRequirements(programId);
    return { success: true, requirements };
  }

  @Roles(...ADMIN_ROLES)
  @UseGuards(RolesGuard)
  @Post(':id/requirements')
  public async createRequirement(
    @Param('id', ParseUUIDPipe) programId: string,
    @Body() dto: CreateProgramRequirementDto,
  ): Promise<{ success: true; requirement: ProgramRequirementResponse }> {
    const requirement = await this.programsService.createRequirement(programId, dto);
    return { success: true, requirement };
  }

  @Roles(...ADMIN_ROLES)
  @UseGuards(RolesGuard)
  @Put(':id/requirements/:requirementId')
  public async updateRequirement(
    @Param('id', ParseUUIDPipe) programId: string,
    @Param('requirementId', ParseUUIDPipe) requirementId: string,
    @Body() dto: UpdateProgramRequirementDto,
  ): Promise<{ success: true; requirement: ProgramRequirementResponse }> {
    const requirement = await this.programsService.updateRequirement(
      programId,
      requirementId,
      dto,
    );
    return { success: true, requirement };
  }

  @Roles(...ADMIN_ROLES)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Delete(':id/requirements/:requirementId')
  public async removeRequirement(
    @Param('id', ParseUUIDPipe) programId: string,
    @Param('requirementId', ParseUUIDPipe) requirementId: string,
  ): Promise<{ success: true }> {
    await this.programsService.removeRequirement(programId, requirementId);
    return { success: true };
  }
}
