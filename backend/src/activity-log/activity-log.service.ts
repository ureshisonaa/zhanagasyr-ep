import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { GLOBAL_READ_ROLES } from '../common/constants/roles.constant';
import { PrismaService } from '../prisma/prisma.service';
import type { ActivityLogEntryResponse } from './interfaces/activity-log-entry-response.interface';
import { toActivityLogEntryResponse } from './utils/to-activity-log-entry-response.util';

@Injectable()
export class ActivityLogService {
  public constructor(private readonly prisma: PrismaService) {}

  /**
   * Вызывается другими сервисами (ApplicationDocuments/Checklists/Chat/
   * Calendar) как побочный эффект основного действия — не выставлен через
   * REST напрямую (тот же принцип, что и Notifications.create, Этап 7.2).
   *
   * actorId=null для системных событий (например авто-отметка чек-листа
   * при одобрении документа AI, а не действием конкретного человека).
   *
   * tx опционален: некоторые вызовы происходят внутри транзакций (например,
   * авто-привязка документа при создании заявки), другие — вне их.
   */
  public async log(
    applicationId: string,
    actorId: string | null,
    action: string,
    description: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.activityLogEntry.create({ data: { applicationId, actorId, action, description } });
  }

  public async findAllForUser(
    currentUser: SanitizedUser,
    applicationId: string,
    limit: number,
  ): Promise<ActivityLogEntryResponse[]> {
    await this.ensureApplicationAccessible(currentUser, applicationId);

    const entries = await this.prisma.activityLogEntry.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { actor: { select: { firstName: true, lastName: true } } },
    });

    return entries.map(toActivityLogEntryResponse);
  }

  private async ensureApplicationAccessible(
    currentUser: SanitizedUser,
    applicationId: string,
  ): Promise<void> {
    const application = await this.prisma.application.findUnique({ where: { id: applicationId } });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.userId !== currentUser.id && !GLOBAL_READ_ROLES.includes(currentUser.role)) {
      throw new ForbiddenException('You do not have access to this application');
    }
  }
}
