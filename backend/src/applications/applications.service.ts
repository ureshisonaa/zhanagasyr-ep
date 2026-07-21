import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AdmissionCycle, ApplicationStatus, Prisma, Program, University } from '@prisma/client';
import { Prisma as PrismaNamespace } from '@prisma/client';
import { ApplicationDocumentsService } from '../application-documents/application-documents.service';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { ChatService } from '../chat/chat.service';
import { ChecklistsService } from '../checklists/checklists.service';
import { GLOBAL_READ_ROLES } from '../common/constants/roles.constant';
import { DocumentsService } from '../documents/documents.service';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationStatusPolicy } from './application-status.policy';
import type { CreateApplicationDto } from './dto/create-application.dto';
import type { QueryApplicationsDto } from './dto/query-applications.dto';
import type { UpdateApplicationStatusDto } from './dto/update-status.dto';
import type { ApplicationResponse } from './interfaces/application-response.interface';
import { toApplicationResponse } from './utils/to-application-response.util';

@Injectable()
export class ApplicationsService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly checklistsService: ChecklistsService,
    private readonly documentsService: DocumentsService,
    private readonly applicationStatusPolicy: ApplicationStatusPolicy,
    private readonly applicationDocumentsService: ApplicationDocumentsService,
    private readonly chatService: ChatService,
  ) {}

  public async create(userId: string, dto: CreateApplicationDto): Promise<ApplicationResponse> {
    const [university, program, admissionCycle] = await Promise.all([
      this.ensureActiveUniversity(dto.universityId),
      this.ensureActiveProgram(dto.programId),
      this.ensureActiveAdmissionCycle(dto.admissionCycleId),
    ]);

    const title = `${university.name} — ${program.name} — ${admissionCycle.name}`;

    try {
      const application = await this.prisma.$transaction(async (tx) => {
        const created = await tx.application.create({
          data: {
            userId,
            universityId: dto.universityId,
            programId: dto.programId,
            admissionCycleId: dto.admissionCycleId,
            title,
            deadline: dto.deadline ? new Date(dto.deadline) : undefined,
          },
        });

        // Запрашиваем ProgramRequirements один раз и передаём обоим сервисам —
        // и авто-привязке документов, и генерации чек-листа нужен один и тот
        // же список; раздельные запросы означали бы дублирование и риск
        // рассинхронизации, если бы каждый сервис вычислял его сам.
        const requirements = await tx.programRequirement.findMany({
          where: { programId: dto.programId },
          orderBy: { order: 'asc' },
        });

        const approvedDocumentIdByType = await this.documentsService.findApprovedDocumentsByTypeForUser(
          userId,
          tx,
        );

        const autoCompletedDocumentTypeIds = new Set(
          requirements
            .filter(
              (requirement) =>
                requirement.documentTypeId !== null &&
                approvedDocumentIdByType.has(requirement.documentTypeId),
            )
            .map((requirement) => requirement.documentTypeId as string),
        );

        // Реализация точки расширения, оставленной в ChecklistsService на
        // Этапе 3.2: "авто-отметка по уже одобренным shared-документам".
        await this.applicationDocumentsService.autoLinkApprovedDocuments(
          created.id,
          approvedDocumentIdByType,
          Array.from(autoCompletedDocumentTypeIds),
          tx,
        );

        await this.checklistsService.generateForApplication(
          created.id,
          requirements,
          autoCompletedDocumentTypeIds,
          tx,
        );

        // 1:1 с заявкой (Часть 2, п.7 ТЗ, актуализировано под Application —
        // Этап 5.2). Тот же title, что и у заявки — не заводим отдельную
        // схему именования чата.
        await this.chatService.createForApplication(created.id, userId, title, tx);

        return created;
      });

      return toApplicationResponse(application);
    } catch (error) {
      if (error instanceof PrismaNamespace.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'An application for this university, program and admission cycle already exists',
        );
      }
      throw error;
    }
  }

  public async findAllForUser(
    currentUser: SanitizedUser,
    query: QueryApplicationsDto,
  ): Promise<PaginatedResult<ApplicationResponse>> {
    const { page, limit, applicationStatus } = query;
    const hasGlobalRead = GLOBAL_READ_ROLES.includes(currentUser.role);

    const where: Prisma.ApplicationWhereInput = {
      ...(applicationStatus ? { applicationStatus } : {}),
      ...(hasGlobalRead ? (query.userId ? { userId: query.userId } : {}) : { userId: currentUser.id }),
    };

    const [items, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.application.count({ where }),
    ]);

    return {
      items: items.map(toApplicationResponse),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  public async findOneForUser(currentUser: SanitizedUser, id: string): Promise<ApplicationResponse> {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    this.ensureCanAccess(currentUser, application.userId);

    return toApplicationResponse(application);
  }

  public async updateStatus(
    currentUser: SanitizedUser,
    id: string,
    dto: UpdateApplicationStatusDto,
  ): Promise<ApplicationResponse> {
    const application = await this.prisma.application.findUnique({ where: { id } });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    this.ensureCanAccess(currentUser, application.userId);
    this.ensureCanSetStatus(currentUser, dto.applicationStatus);

    const updated = await this.prisma.application.update({
      where: { id },
      data: { applicationStatus: dto.applicationStatus },
    });

    return toApplicationResponse(updated);
  }

  /** Владелец заявки ИЛИ роль с глобальным доступом на чтение. */
  private ensureCanAccess(currentUser: SanitizedUser, ownerUserId: string): void {
    const hasGlobalRead = GLOBAL_READ_ROLES.includes(currentUser.role);

    if (!hasGlobalRead && ownerUserId !== currentUser.id) {
      throw new ForbiddenException('You do not have access to this application');
    }
  }

  /**
   * Финальные статусы (Accepted/Rejected/Enrolled) — только Admin/SuperAdmin
   * (решение по Mentor, раунд 3). Это общее бизнес-правило, а не только
   * ограничение для Mentor: сам студент тоже не может проставить себе
   * "Accepted".
   */
  private ensureCanSetStatus(currentUser: SanitizedUser, status: ApplicationStatus): void {
    if (!this.applicationStatusPolicy.canSetStatus(currentUser.role, status)) {
      throw new ForbiddenException('Only Admin or SuperAdmin can set a final application status');
    }
  }

  private async ensureActiveUniversity(id: string): Promise<University> {
    const university = await this.prisma.university.findFirst({ where: { id, isActive: true } });

    if (!university) {
      throw new NotFoundException('University not found');
    }

    return university;
  }

  private async ensureActiveProgram(id: string): Promise<Program> {
    const program = await this.prisma.program.findFirst({ where: { id, isActive: true } });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    return program;
  }

  private async ensureActiveAdmissionCycle(id: string): Promise<AdmissionCycle> {
    const admissionCycle = await this.prisma.admissionCycle.findFirst({
      where: { id, isActive: true },
    });

    if (!admissionCycle) {
      throw new NotFoundException('Admission cycle not found');
    }

    return admissionCycle;
  }
}
