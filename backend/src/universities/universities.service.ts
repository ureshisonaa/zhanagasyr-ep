import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateUniversityDto } from './dto/create-university.dto';
import type { QueryUniversitiesDto } from './dto/query-universities.dto';
import type { UpdateUniversityDto } from './dto/update-university.dto';
import type { UniversityResponse } from './interfaces/university-response.interface';
import { toUniversityResponse } from './utils/to-university-response.util';

const ADMIN_ROLES = ['Admin', 'SuperAdmin'];

@Injectable()
export class UniversitiesService {
  public constructor(private readonly prisma: PrismaService) {}

  /**
   * По умолчанию — только isActive=true. Admin/SuperAdmin с явным
   * includeInactive=true видят и деактивированные (Этап 11.2, закрывает
   * пробел, изначально отложенный до Admin Panel) — иначе реактивировать
   * университет через UI было бы невозможно: он бы просто исчезал из
   * списка сразу после деактивации.
   */
  public async findAll(
    query: QueryUniversitiesDto,
    currentUser: SanitizedUser,
  ): Promise<PaginatedResult<UniversityResponse>> {
    const { page, limit, search, country, includeInactive } = query;
    const canSeeInactive = includeInactive && ADMIN_ROLES.includes(currentUser.role);

    const where: Prisma.UniversityWhereInput = {
      ...(canSeeInactive ? {} : { isActive: true }),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(country ? { country: { equals: country, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.university.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.university.count({ where }),
    ]);

    return {
      items: items.map(toUniversityResponse),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  public async findOne(id: string, currentUser: SanitizedUser): Promise<UniversityResponse> {
    const isAdmin = ADMIN_ROLES.includes(currentUser.role);
    const university = isAdmin
      ? await this.prisma.university.findUnique({ where: { id } })
      : await this.prisma.university.findFirst({ where: { id, isActive: true } });

    if (!university) {
      throw new NotFoundException('University not found');
    }

    return toUniversityResponse(university);
  }

  public async create(dto: CreateUniversityDto): Promise<UniversityResponse> {
    const university = await this.prisma.university.create({ data: dto });
    return toUniversityResponse(university);
  }

  public async update(id: string, dto: UpdateUniversityDto): Promise<UniversityResponse> {
    await this.findOneAnyStatusOrThrow(id);
    const university = await this.prisma.university.update({ where: { id }, data: dto });
    return toUniversityResponse(university);
  }

  /** Soft-delete: университет остаётся в БД, но скрывается из списка для не-Admin. */
  public async softDelete(id: string): Promise<void> {
    await this.findOneAnyStatusOrThrow(id);
    await this.prisma.university.update({ where: { id }, data: { isActive: false } });
  }

  /**
   * Для admin-мутаций (update/delete) не фильтруем по isActive — иначе
   * админ не смог бы отредактировать или реактивировать уже
   * деактивированный университет.
   */
  private async findOneAnyStatusOrThrow(id: string): Promise<void> {
    const exists = await this.prisma.university.findUnique({ where: { id } });

    if (!exists) {
      throw new NotFoundException('University not found');
    }
  }
}
