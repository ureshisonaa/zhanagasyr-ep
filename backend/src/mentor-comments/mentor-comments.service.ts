import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { MentorComment } from '@prisma/client';
import { ActivityLogService } from '../activity-log/activity-log.service';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { GLOBAL_READ_ROLES } from '../common/constants/roles.constant';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMentorCommentDto } from './dto/create-mentor-comment.dto';
import type { UpdateMentorCommentDto } from './dto/update-mentor-comment.dto';
import type { MentorCommentResponse } from './interfaces/mentor-comment-response.interface';
import { toMentorCommentResponse } from './utils/to-mentor-comment-response.util';

const ADMIN_ROLES = ['Admin', 'SuperAdmin'];

@Injectable()
export class MentorCommentsService {
  private readonly logger = new Logger(MentorCommentsService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /**
   * Только Mentor/Admin/SuperAdmin — в отличие от Notes (Этап 8.1, пишут
   * и студент, и наставник), MentorComment это обратная связь ОТ
   * наставника, а не общая заметка.
   */
  public async create(
    currentUser: SanitizedUser,
    dto: CreateMentorCommentDto,
  ): Promise<MentorCommentResponse> {
    if (!GLOBAL_READ_ROLES.includes(currentUser.role)) {
      throw new ForbiddenException('Only Mentor/Admin/SuperAdmin can leave mentor comments');
    }

    if (!dto.applicationId && !dto.documentId) {
      throw new BadRequestException('Either applicationId or documentId must be provided');
    }

    if (dto.applicationId) {
      await this.ensureApplicationExists(dto.applicationId);
    }
    if (dto.documentId) {
      await this.ensureDocumentExists(dto.documentId);
    }

    const comment = await this.prisma.mentorComment.create({
      data: {
        applicationId: dto.applicationId,
        documentId: dto.documentId,
        authorId: currentUser.id,
        content: dto.content,
        isInternal: dto.isInternal ?? false,
      },
      include: { author: { select: { firstName: true, lastName: true } } },
    });

    if (dto.applicationId) {
      try {
        await this.activityLogService.log(
          dto.applicationId,
          currentUser.id,
          'MentorCommentAdded',
          'Наставник оставил комментарий',
        );
      } catch (logError) {
        this.logger.warn(`Failed to write activity log for mentor comment: ${String(logError)}`);
      }
    }

    return toMentorCommentResponse(comment);
  }

  public async findAllForApplication(
    currentUser: SanitizedUser,
    applicationId: string,
  ): Promise<MentorCommentResponse[]> {
    const application = await this.ensureApplicationExists(applicationId);
    this.ensureCanRead(currentUser, application.userId);

    return this.findVisible(currentUser, { applicationId, deletedAt: null });
  }

  public async findAllForDocument(
    currentUser: SanitizedUser,
    documentId: string,
  ): Promise<MentorCommentResponse[]> {
    const document = await this.ensureDocumentExists(documentId);
    this.ensureCanRead(currentUser, document.userId);

    return this.findVisible(currentUser, { documentId, deletedAt: null });
  }

  /** Редактирование — только автор, независимо от роли (тот же принцип, что и у Notes). */
  public async update(
    currentUser: SanitizedUser,
    id: string,
    dto: UpdateMentorCommentDto,
  ): Promise<MentorCommentResponse> {
    const comment = await this.findExistingOrThrow(id);

    if (comment.authorId !== currentUser.id) {
      throw new ForbiddenException('Only the author can edit this comment');
    }

    const updated = await this.prisma.mentorComment.update({
      where: { id },
      data: { content: dto.content, isInternal: dto.isInternal },
      include: { author: { select: { firstName: true, lastName: true } } },
    });

    return toMentorCommentResponse(updated);
  }

  /** Удаление — автор или Admin/SuperAdmin (тот же принцип, что и у Notes/Calendar). */
  public async remove(currentUser: SanitizedUser, id: string): Promise<void> {
    const comment = await this.findExistingOrThrow(id);

    if (comment.authorId !== currentUser.id && !ADMIN_ROLES.includes(currentUser.role)) {
      throw new ForbiddenException('Only the author or an administrator can delete this comment');
    }

    await this.prisma.mentorComment.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async findVisible(
    currentUser: SanitizedUser,
    where: Record<string, unknown>,
  ): Promise<MentorCommentResponse[]> {
    const isMentorOrAdmin = GLOBAL_READ_ROLES.includes(currentUser.role);

    const comments = await this.prisma.mentorComment.findMany({
      where: { ...where, ...(isMentorOrAdmin ? {} : { isInternal: false }) },
      include: { author: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return comments.map(toMentorCommentResponse);
  }

  private ensureCanRead(currentUser: SanitizedUser, ownerUserId: string): void {
    if (ownerUserId !== currentUser.id && !GLOBAL_READ_ROLES.includes(currentUser.role)) {
      throw new ForbiddenException('You do not have access to these comments');
    }
  }

  private async findExistingOrThrow(id: string): Promise<MentorComment> {
    const comment = await this.prisma.mentorComment.findUnique({ where: { id } });

    if (!comment || comment.deletedAt) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  private async ensureApplicationExists(id: string): Promise<{ userId: string }> {
    const application = await this.prisma.application.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  private async ensureDocumentExists(id: string): Promise<{ userId: string }> {
    const document = await this.prisma.document.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }
}
