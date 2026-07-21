import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Program, ProgramRequirement } from '@prisma/client';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateProgramRequirementDto } from './dto/create-program-requirement.dto';
import type { CreateProgramDto } from './dto/create-program.dto';
import type { QueryProgramsDto } from './dto/query-programs.dto';
import type { UpdateProgramRequirementDto } from './dto/update-program-requirement.dto';
import type { UpdateProgramDto } from './dto/update-program.dto';
import type { ProgramRequirementResponse } from './interfaces/program-requirement-response.interface';
import type { ProgramResponse } from './interfaces/program-response.interface';

const ADMIN_ROLES = ['Admin', 'SuperAdmin'];

@Injectable()
export class ProgramsService {
  public constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------
  // Program CRUD
  // ---------------------------------------------------------------------

  /** См. комментарий в UniversitiesService.findAll — тот же принцип includeInactive для Admin/SuperAdmin (Этап 11.2). */
  public async findAll(
    query: QueryProgramsDto,
    currentUser: SanitizedUser,
  ): Promise<PaginatedResult<ProgramResponse>> {
    const { page, limit, search, universityId, degreeLevel, includeInactive } = query;
    const canSeeInactive = includeInactive && ADMIN_ROLES.includes(currentUser.role);

    const where: Prisma.ProgramWhereInput = {
      ...(canSeeInactive ? {} : { isActive: true }),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(universityId ? { universityId } : {}),
      ...(degreeLevel ? { degreeLevel } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.program.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.program.count({ where }),
    ]);

    return {
      items: items.map(this.toProgramResponse),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  public async findOne(id: string, currentUser: SanitizedUser): Promise<ProgramResponse> {
    const isAdmin = ADMIN_ROLES.includes(currentUser.role);
    const program = isAdmin
      ? await this.prisma.program.findUnique({ where: { id } })
      : await this.prisma.program.findFirst({ where: { id, isActive: true } });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    return this.toProgramResponse(program);
  }

  public async create(dto: CreateProgramDto): Promise<ProgramResponse> {
    await this.ensureUniversityExists(dto.universityId);
    const program = await this.prisma.program.create({ data: dto });
    return this.toProgramResponse(program);
  }

  public async update(id: string, dto: UpdateProgramDto): Promise<ProgramResponse> {
    await this.findProgramAnyStatusOrThrow(id);

    if (dto.universityId) {
      await this.ensureUniversityExists(dto.universityId);
    }

    const program = await this.prisma.program.update({ where: { id }, data: dto });
    return this.toProgramResponse(program);
  }

  /**
   * Soft-delete — как и University: с Фазы 3 на программу ссылается
   * Application.programId, жёсткое удаление сломало бы уже существующие
   * заявки.
   */
  public async softDelete(id: string): Promise<void> {
    await this.findProgramAnyStatusOrThrow(id);
    await this.prisma.program.update({ where: { id }, data: { isActive: false } });
  }

  // ---------------------------------------------------------------------
  // ProgramRequirement CRUD (вложенный ресурс /programs/:id/requirements)
  // ---------------------------------------------------------------------

  public async findRequirements(programId: string): Promise<ProgramRequirementResponse[]> {
    await this.findProgramAnyStatusOrThrow(programId);

    const requirements = await this.prisma.programRequirement.findMany({
      where: { programId },
      orderBy: { order: 'asc' },
    });

    return requirements.map(this.toProgramRequirementResponse);
  }

  public async createRequirement(
    programId: string,
    dto: CreateProgramRequirementDto,
  ): Promise<ProgramRequirementResponse> {
    await this.findProgramAnyStatusOrThrow(programId);

    if (dto.documentTypeId) {
      await this.ensureDocumentTypeExists(dto.documentTypeId);
    }

    const requirement = await this.prisma.programRequirement.create({
      data: { ...dto, programId },
    });

    return this.toProgramRequirementResponse(requirement);
  }

  public async updateRequirement(
    programId: string,
    requirementId: string,
    dto: UpdateProgramRequirementDto,
  ): Promise<ProgramRequirementResponse> {
    await this.findRequirementOrThrow(programId, requirementId);

    if (dto.documentTypeId) {
      await this.ensureDocumentTypeExists(dto.documentTypeId);
    }

    const requirement = await this.prisma.programRequirement.update({
      where: { id: requirementId },
      data: dto,
    });

    return this.toProgramRequirementResponse(requirement);
  }

  /**
   * Настоящее (не soft) удаление: в отличие от Program/University, шаблон
   * требования не имеет долгоживущих внешних ссылок — при создании
   * Application (Фаза 3) он копируется в ChecklistItems как независимый
   * снепшот (см. решения по Части 6, §1), поэтому удаление шаблона
   * безопасно.
   */
  public async removeRequirement(programId: string, requirementId: string): Promise<void> {
    await this.findRequirementOrThrow(programId, requirementId);
    await this.prisma.programRequirement.delete({ where: { id: requirementId } });
  }

  // ---------------------------------------------------------------------
  // Внутренние помощники
  // ---------------------------------------------------------------------

  private async ensureUniversityExists(universityId: string): Promise<void> {
    const exists = await this.prisma.university.findUnique({ where: { id: universityId } });

    if (!exists) {
      throw new NotFoundException('University not found');
    }
  }

  private async ensureDocumentTypeExists(documentTypeId: string): Promise<void> {
    const exists = await this.prisma.documentType.findUnique({ where: { id: documentTypeId } });

    if (!exists) {
      throw new NotFoundException('Document type not found');
    }
  }

  /** Не фильтрует по isActive — админ должен уметь редактировать/реактивировать. */
  private async findProgramAnyStatusOrThrow(id: string): Promise<void> {
    const exists = await this.prisma.program.findUnique({ where: { id } });

    if (!exists) {
      throw new NotFoundException('Program not found');
    }
  }

  private async findRequirementOrThrow(programId: string, requirementId: string): Promise<void> {
    const requirement = await this.prisma.programRequirement.findUnique({
      where: { id: requirementId },
    });

    if (!requirement || requirement.programId !== programId) {
      throw new NotFoundException('Program requirement not found');
    }
  }

  private toProgramResponse(program: Program): ProgramResponse {
    return {
      id: program.id,
      universityId: program.universityId,
      name: program.name,
      degreeLevel: program.degreeLevel,
      description: program.description,
      duration: program.duration,
      isActive: program.isActive,
      createdAt: program.createdAt,
      updatedAt: program.updatedAt,
    };
  }

  private toProgramRequirementResponse(
    requirement: ProgramRequirement,
  ): ProgramRequirementResponse {
    return {
      id: requirement.id,
      programId: requirement.programId,
      documentTypeId: requirement.documentTypeId,
      label: requirement.label,
      isRequired: requirement.isRequired,
      order: requirement.order,
      createdAt: requirement.createdAt,
      updatedAt: requirement.updatedAt,
    };
  }
}
