import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Application, Prisma } from '@prisma/client';
import { Prisma as PrismaNamespace } from '@prisma/client';
import { ActivityLogService } from '../activity-log/activity-log.service';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { GLOBAL_READ_ROLES } from '../common/constants/roles.constant';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateApplicationDocumentDto } from './dto/create-application-document.dto';
import type { ApplicationDocumentResponse } from './interfaces/application-document-response.interface';
import { toApplicationDocumentResponse } from './utils/to-application-document-response.util';

@Injectable()
export class ApplicationDocumentsService {
  private readonly logger = new Logger(ApplicationDocumentsService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  public async link(
    currentUser: SanitizedUser,
    dto: CreateApplicationDocumentDto,
  ): Promise<ApplicationDocumentResponse> {
    await this.ensureApplicationAccessible(currentUser, dto.applicationId);
    await this.ensureDocumentOwnedByUser(currentUser.id, dto.documentId);

    try {
      const link = await this.prisma.applicationDocument.create({
        data: {
          applicationId: dto.applicationId,
          documentId: dto.documentId,
          isShared: dto.isShared ?? false,
        },
        include: { document: true },
      });

      try {
        await this.activityLogService.log(
          dto.applicationId,
          currentUser.id,
          'DocumentLinked',
          `Добавлен документ «${link.document.fileName}»`,
        );
      } catch (logError) {
        this.logger.warn(`Failed to write activity log for document link: ${String(logError)}`);
      }

      return toApplicationDocumentResponse(link);
    } catch (error) {
      if (error instanceof PrismaNamespace.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This document is already linked to this application');
      }
      throw error;
    }
  }

  public async findAllForApplication(
    currentUser: SanitizedUser,
    applicationId: string,
  ): Promise<ApplicationDocumentResponse[]> {
    await this.ensureApplicationAccessible(currentUser, applicationId);

    const links = await this.prisma.applicationDocument.findMany({
      where: { applicationId },
      include: { document: true },
      orderBy: { addedAt: 'desc' },
    });

    return links.map(toApplicationDocumentResponse);
  }

  /** Удаляет только связь — физический документ (Drive-файл, запись Document) не затрагивается. */
  public async unlink(currentUser: SanitizedUser, id: string): Promise<void> {
    const link = await this.prisma.applicationDocument.findUnique({ where: { id } });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    await this.ensureApplicationAccessible(currentUser, link.applicationId);
    await this.prisma.applicationDocument.delete({ where: { id } });
  }

  /**
   * Вызывается ТОЛЬКО из ApplicationsService.create() внутри транзакции —
   * реализация "переиспользования общих документов", описанного в решениях
   * по Части 6 (§5.1). Не выполняет проверки доступа: userId уже доверенный
   * контекст (владелец только что создаваемой заявки).
   */
  public async autoLinkApprovedDocuments(
    applicationId: string,
    documentTypeIdToDocumentId: Map<string, string>,
    documentTypeIds: readonly string[],
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    for (const documentTypeId of documentTypeIds) {
      const documentId = documentTypeIdToDocumentId.get(documentTypeId);

      if (!documentId) {
        continue;
      }

      const link = await tx.applicationDocument.create({
        data: { applicationId, documentId, isShared: true },
        include: { document: true },
      });

      // actorId=null — это системное действие (переиспользование уже
      // одобренного документа при создании заявки), а не решение
      // конкретного человека.
      await this.activityLogService.log(
        applicationId,
        null,
        'DocumentLinked',
        `Автоматически привязан ранее одобренный документ «${link.document.fileName}»`,
        tx,
      );
    }
  }

  /** Владелец заявки ИЛИ роль с глобальным доступом на чтение (та же политика, что у Applications/Checklists). */
  private async ensureApplicationAccessible(
    currentUser: SanitizedUser,
    applicationId: string,
  ): Promise<Application> {
    const application = await this.prisma.application.findUnique({ where: { id: applicationId } });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (!GLOBAL_READ_ROLES.includes(currentUser.role) && application.userId !== currentUser.id) {
      throw new ForbiddenException('You do not have access to this application');
    }

    return application;
  }

  private async ensureDocumentOwnedByUser(userId: string, documentId: string): Promise<void> {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });

    if (!document || document.userId !== userId) {
      throw new NotFoundException('Document not found');
    }
  }
}
