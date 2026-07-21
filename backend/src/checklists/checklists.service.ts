import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma, ProgramRequirement } from '@prisma/client';
import { ActivityLogService } from '../activity-log/activity-log.service';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { GLOBAL_READ_ROLES } from '../common/constants/roles.constant';
import { PrismaService } from '../prisma/prisma.service';
import type { ChecklistItemResponse } from './interfaces/checklist-item-response.interface';
import type { ChecklistResponse } from './interfaces/checklist-response.interface';
import { toChecklistItemResponse, toChecklistResponse } from './utils/to-checklist-response.util';

@Injectable()
export class ChecklistsService {
  private readonly logger = new Logger(ChecklistsService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /**
   * Вызывается из ApplicationsService.create() ВНУТРИ одной Prisma-транзакции
   * с созданием самой заявки (передаётся `tx`) — если генерация чек-листа
   * упадёт, заявка не должна остаться в БД без него.
   *
   * `requirements` и `autoCompletedDocumentTypeIds` вычисляются оркестратором
   * (ApplicationsService), а не этим сервисом (Этап 4.3, было переработано):
   * оба значения нужны ОДНОВременно и ApplicationDocumentsService (для
   * авто-привязки уже одобренных документов), и этому методу — вычислять их
   * отдельно в двух местах означало бы либо дублирующий запрос
   * ProgramRequirements, либо циклическую зависимость Checklists <->
   * ApplicationDocuments. ApplicationsService запрашивает requirements один
   * раз и передаёт обоим сервисам.
   */
  public async generateForApplication(
    applicationId: string,
    requirements: ProgramRequirement[],
    autoCompletedDocumentTypeIds: ReadonlySet<string>,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const checklist = await tx.checklist.create({ data: { applicationId } });

    if (requirements.length === 0) {
      return;
    }

    await tx.checklistItem.createMany({
      data: requirements.map((requirement) => {
        const isAutoCompleted =
          requirement.documentTypeId !== null &&
          autoCompletedDocumentTypeIds.has(requirement.documentTypeId);

        return {
          checklistId: checklist.id,
          label: requirement.label,
          documentTypeId: requirement.documentTypeId,
          isCompleted: isAutoCompleted,
          completedAt: isAutoCompleted ? new Date() : null,
          completedBy: isAutoCompleted ? ('System' as const) : null,
          sourceRequirementId: requirement.id,
        };
      }),
    });
  }

  /**
   * Вызывается VerificationService (Этап 6.1) сразу после проставления
   * документу статуса Approved. Документ может быть привязан сразу к
   * НЕСКОЛЬКИМ заявкам (переиспользуемые документы вроде паспорта —
   * ApplicationDocuments, Этап 4.3), поэтому отмечаем пункты во всех
   * заявках, где есть связь с этим документом, а не только в одной.
   *
   * updateMany с isCompleted: false в условии — идемпотентно: повторный
   * вызов (например, при ре-верификации) не перезаписывает уже
   * существующие completedAt/completedBy для уже отмеченных пунктов.
   */
  public async markItemsCompletedForApprovedDocument(
    documentId: string,
    documentTypeId: string,
  ): Promise<void> {
    const links = await this.prisma.applicationDocument.findMany({ where: { documentId } });

    for (const link of links) {
      const checklist = await this.prisma.checklist.findUnique({
        where: { applicationId: link.applicationId },
      });

      if (!checklist) {
        continue;
      }

      const updateResult = await this.prisma.checklistItem.updateMany({
        where: { checklistId: checklist.id, documentTypeId, isCompleted: false },
        data: { isCompleted: true, completedAt: new Date(), completedBy: 'System' },
      });

      if (updateResult.count > 0) {
        try {
          const updatedItem = await this.prisma.checklistItem.findFirst({
            where: { checklistId: checklist.id, documentTypeId },
          });

          await this.activityLogService.log(
            link.applicationId,
            null,
            'ChecklistItemCompleted',
            `Пункт чек-листа «${updatedItem?.label ?? 'без названия'}» отмечен выполненным`,
          );
        } catch (logError) {
          this.logger.warn(`Failed to write activity log for checklist completion: ${String(logError)}`);
        }
      }
    }
  }

  /**
   * Ручная отметка пункта чек-листа — закрывает пробел с решением раунда 3
   * ("Mentor может отмечать ChecklistItems"): до этого единственным
   * способом отметки была авто-completion (Этапы 3.2/6.2), ручного пути
   * не существовало вовсе.
   *
   * Только Mentor/Admin/SuperAdmin — решение явно называло это правом
   * Mentor, не студента; расширение на самих студентов не запрашивалось
   * и не реализовано (может стать отдельным решением в будущем).
   */
  public async toggleItem(
    currentUser: SanitizedUser,
    itemId: string,
    dto: { isCompleted: boolean },
  ): Promise<ChecklistItemResponse> {
    if (!GLOBAL_READ_ROLES.includes(currentUser.role)) {
      throw new ForbiddenException('Only Mentor/Admin/SuperAdmin can manually toggle checklist items');
    }

    const item = await this.prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: { checklist: true },
    });

    if (!item) {
      throw new NotFoundException('Checklist item not found');
    }

    const updated = await this.prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        isCompleted: dto.isCompleted,
        completedAt: dto.isCompleted ? new Date() : null,
        completedBy: dto.isCompleted ? 'Mentor' : null,
      },
    });

    try {
      await this.activityLogService.log(
        item.checklist.applicationId,
        currentUser.id,
        'ChecklistItemToggled',
        `Пункт чек-листа «${updated.label}» отмечен ${dto.isCompleted ? 'выполненным' : 'невыполненным'} наставником`,
      );
    } catch (logError) {
      this.logger.warn(`Failed to write activity log for checklist toggle: ${String(logError)}`);
    }

    return toChecklistItemResponse(updated);
  }

  public async getByApplicationForUser(
    currentUser: SanitizedUser,
    applicationId: string,
  ): Promise<ChecklistResponse> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    this.ensureCanAccess(currentUser, application.userId);

    const checklist = await this.prisma.checklist.findUnique({
      where: { applicationId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    if (!checklist) {
      throw new NotFoundException('Checklist not found for this application');
    }

    return toChecklistResponse(checklist);
  }

  /**
   * Владелец заявки ИЛИ роль с глобальным доступом на чтение.
   *
   * Дублирует одноимённую проверку в ApplicationsService намеренно — иначе
   * ChecklistsModule импортировал бы ApplicationsModule, а ApplicationsModule
   * уже импортирует ChecklistsModule (для генерации), что дало бы
   * циклическую зависимость модулей. Список ролей вынесен в общую константу
   * (common/constants/roles.constant.ts).
   */
  private ensureCanAccess(currentUser: SanitizedUser, ownerUserId: string): void {
    if (!GLOBAL_READ_ROLES.includes(currentUser.role) && ownerUserId !== currentUser.id) {
      throw new ForbiddenException('You do not have access to this checklist');
    }
  }
}
