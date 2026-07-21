import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { PrismaService } from '../../prisma/prisma.service';
import type { QueryAdminLogsDto } from './dto/query-admin-logs.dto';
import type { AdminLogEntryResponse } from './interfaces/admin-log-entry-response.interface';
import { toAdminLogEntryResponse } from './utils/to-admin-log-entry-response.util';

@Injectable()
export class AdminLogsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async findAll(query: QueryAdminLogsDto): Promise<PaginatedResult<AdminLogEntryResponse>> {
    const { page, limit, adminId } = query;
    const where: Prisma.AdminLogEntryWhereInput = adminId ? { adminId } : {};

    const [items, total] = await Promise.all([
      this.prisma.adminLogEntry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.adminLogEntry.count({ where }),
    ]);

    return {
      items: items.map(toAdminLogEntryResponse),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
