import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Role } from '@prisma/client';
import { Prisma as PrismaNamespace } from '@prisma/client';
import type { SanitizedUser } from '../../auth/interfaces/sanitized-user.interface';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { hashPassword } from '../../common/utils/password.util';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { QueryUsersDto } from './dto/query-users.dto';
import type { UpdateUserRoleDto } from './dto/update-user-role.dto';
import type { AdminUserResponse } from './interfaces/admin-user-response.interface';
import { toAdminUserResponse } from './utils/to-admin-user-response.util';

const SUPER_ADMIN_ROLE = 'SuperAdmin';

@Injectable()
export class AdminUsersService {
  public constructor(private readonly prisma: PrismaService) {}

  public async findAll(query: QueryUsersDto): Promise<PaginatedResult<AdminUserResponse>> {
    const { page, limit, role, isActive, search } = query;

    const where: Prisma.UserWhereInput = {
      ...(role ? { role: { name: role } } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { role: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map(toAdminUserResponse),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Единственный способ появления нового пользователя — самостоятельная регистрация не предусмотрена (ТЗ). */
  public async create(currentUser: SanitizedUser, dto: CreateUserDto): Promise<AdminUserResponse> {
    this.ensureCanAssignRole(currentUser, dto.role);

    const role = await this.findRoleByNameOrThrow(dto.role);
    const passwordHash = await hashPassword(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          roleId: role.id,
        },
        include: { role: true },
      });

      return toAdminUserResponse(user);
    } catch (error) {
      if (error instanceof PrismaNamespace.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A user with this email already exists');
      }
      throw error;
    }
  }

  /**
   * tokenVersion увеличивается — смена роли должна инвалидировать уже
   * выданные токены (новые права требуют новой сессии), тот же принцип,
   * что и при смене пароля (Этап 1.3).
   */
  public async updateRole(
    currentUser: SanitizedUser,
    userId: string,
    dto: UpdateUserRoleDto,
  ): Promise<AdminUserResponse> {
    this.ensureCanAssignRole(currentUser, dto.role);

    const role = await this.findRoleByNameOrThrow(dto.role);
    await this.ensureUserExists(userId);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { roleId: role.id, tokenVersion: { increment: 1 } },
      include: { role: true },
    });

    return toAdminUserResponse(user);
  }

  /**
   * Деактивация, НЕ удаление ("Удаление пользователя запрещено", ТЗ).
   * tokenVersion++ и isActive=false вместе перекрывают доступ немедленно:
   * JwtAccessStrategy проверяет isActive на каждый запрос (Этап 1.1) —
   * действующий access-токен деактивированного перестаёт работать сразу,
   * не дожидаясь истечения; refresh — тоже сразу, из-за tokenVersion.
   */
  public async setActive(userId: string, isActive: boolean): Promise<AdminUserResponse> {
    await this.ensureUserExists(userId);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive, tokenVersion: { increment: 1 } },
      include: { role: true },
    });

    return toAdminUserResponse(user);
  }

  /** Только SuperAdmin может выдать роль SuperAdmin — Admin не может назначить себе/другим равные или более широкие права. */
  private ensureCanAssignRole(currentUser: SanitizedUser, targetRole: string): void {
    if (targetRole === SUPER_ADMIN_ROLE && currentUser.role !== SUPER_ADMIN_ROLE) {
      throw new ForbiddenException('Only SuperAdmin can grant the SuperAdmin role');
    }
  }

  private async findRoleByNameOrThrow(name: string): Promise<Role> {
    const role = await this.prisma.role.findUnique({ where: { name } });

    if (!role) {
      throw new NotFoundException(`Role "${name}" not found`);
    }

    return role;
  }

  private async ensureUserExists(id: string): Promise<void> {
    const exists = await this.prisma.user.findUnique({ where: { id } });

    if (!exists) {
      throw new NotFoundException('User not found');
    }
  }
}
