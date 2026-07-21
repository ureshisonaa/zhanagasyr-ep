import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AdmissionCycle, Prisma } from '@prisma/client';
import { Prisma as PrismaNamespace } from '@prisma/client';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAdmissionCycleDto } from './dto/create-admission-cycle.dto';
import type { QueryAdmissionCyclesDto } from './dto/query-admission-cycles.dto';
import type { UpdateAdmissionCycleDto } from './dto/update-admission-cycle.dto';
import type { AdmissionCycleResponse } from './interfaces/admission-cycle-response.interface';

const ADMIN_ROLES = ['Admin', 'SuperAdmin'];

@Injectable()
export class AdmissionCyclesService {
  public constructor(private readonly prisma: PrismaService) {}

  /** См. комментарий в UniversitiesService.findAll — тот же принцип includeInactive для Admin/SuperAdmin (Этап 11.2). */
  public async findAll(
    query: QueryAdmissionCyclesDto,
    currentUser: SanitizedUser,
  ): Promise<PaginatedResult<AdmissionCycleResponse>> {
    const { page, limit, year, season, includeInactive } = query;
    const canSeeInactive = includeInactive && ADMIN_ROLES.includes(currentUser.role);

    const where: Prisma.AdmissionCycleWhereInput = {
      ...(canSeeInactive ? {} : { isActive: true }),
      ...(year ? { year } : {}),
      ...(season ? { season } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.admissionCycle.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ year: 'asc' }, { season: 'asc' }],
      }),
      this.prisma.admissionCycle.count({ where }),
    ]);

    return {
      items: items.map(this.toResponse),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  public async findOne(id: string, currentUser: SanitizedUser): Promise<AdmissionCycleResponse> {
    const isAdmin = ADMIN_ROLES.includes(currentUser.role);
    const cycle = isAdmin
      ? await this.prisma.admissionCycle.findUnique({ where: { id } })
      : await this.prisma.admissionCycle.findFirst({ where: { id, isActive: true } });

    if (!cycle) {
      throw new NotFoundException('Admission cycle not found');
    }

    return this.toResponse(cycle);
  }

  public async create(dto: CreateAdmissionCycleDto): Promise<AdmissionCycleResponse> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    this.validateDateRange(startDate, endDate);

    try {
      const cycle = await this.prisma.admissionCycle.create({
        data: { name: dto.name, season: dto.season, year: dto.year, startDate, endDate },
      });
      return this.toResponse(cycle);
    } catch (error) {
      throw this.mapKnownError(error);
    }
  }

  public async update(id: string, dto: UpdateAdmissionCycleDto): Promise<AdmissionCycleResponse> {
    const existing = await this.findExistingOrThrow(id);

    const startDate = dto.startDate ? new Date(dto.startDate) : existing.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : existing.endDate;
    this.validateDateRange(startDate, endDate);

    try {
      const cycle = await this.prisma.admissionCycle.update({
        where: { id },
        data: {
          name: dto.name,
          season: dto.season,
          year: dto.year,
          startDate: dto.startDate ? startDate : undefined,
          endDate: dto.endDate ? endDate : undefined,
          isActive: dto.isActive,
        },
      });
      return this.toResponse(cycle);
    } catch (error) {
      throw this.mapKnownError(error);
    }
  }

  /** Soft-delete — с Фазы 3 на цикл ссылается Application.admissionCycleId. */
  public async softDelete(id: string): Promise<void> {
    await this.findExistingOrThrow(id);
    await this.prisma.admissionCycle.update({ where: { id }, data: { isActive: false } });
  }

  private validateDateRange(startDate: Date, endDate: Date): void {
    if (endDate <= startDate) {
      throw new BadRequestException('endDate must be after startDate');
    }
  }

  private async findExistingOrThrow(id: string): Promise<AdmissionCycle> {
    const existing = await this.prisma.admissionCycle.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Admission cycle not found');
    }

    return existing;
  }

  private mapKnownError(error: unknown): Error {
    if (error instanceof PrismaNamespace.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictException('An admission cycle with this season and year already exists');
    }

    return error instanceof Error ? error : new Error('Unknown error');
  }

  private toResponse(cycle: AdmissionCycle): AdmissionCycleResponse {
    return {
      id: cycle.id,
      name: cycle.name,
      season: cycle.season,
      year: cycle.year,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      isActive: cycle.isActive,
      createdAt: cycle.createdAt,
      updatedAt: cycle.updatedAt,
    };
  }
}
