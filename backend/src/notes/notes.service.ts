import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Note } from '@prisma/client';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { GLOBAL_READ_ROLES } from '../common/constants/roles.constant';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateNoteDto } from './dto/create-note.dto';
import type { UpdateNoteDto } from './dto/update-note.dto';
import type { NoteResponse } from './interfaces/note-response.interface';
import { toNoteResponse } from './utils/to-note-response.util';

const ADMIN_ROLES = ['Admin', 'SuperAdmin'];

@Injectable()
export class NotesService {
  public constructor(private readonly prisma: PrismaService) {}

  /** Владелец заявки ИЛИ Mentor/Admin/SuperAdmin (решение раунда 3: "может создавать заметки"). */
  public async create(
    currentUser: SanitizedUser,
    applicationId: string,
    dto: CreateNoteDto,
  ): Promise<NoteResponse> {
    await this.ensureApplicationAccessible(currentUser, applicationId);

    const isMentorOrAdmin = GLOBAL_READ_ROLES.includes(currentUser.role);

    const note = await this.prisma.note.create({
      data: {
        applicationId,
        userId: currentUser.id,
        content: dto.content,
        isPinned: dto.isPinned ?? false,
        // Student не может пометить собственную заметку как internal —
        // скрывать что-то от самого себя бессмысленно, и решение раунда 3
        // давало это право только Mentor/Admin/SuperAdmin.
        isInternal: isMentorOrAdmin ? (dto.isInternal ?? false) : false,
      },
    });

    return toNoteResponse(note);
  }

  /**
   * isInternal=false видят все с доступом к заявке; isInternal=true —
   * только Mentor/Admin/SuperAdmin (тот же паттерн видимости, что уже
   * принят для MentorComments.isInternal).
   */
  public async findAllForApplication(
    currentUser: SanitizedUser,
    applicationId: string,
  ): Promise<NoteResponse[]> {
    await this.ensureApplicationAccessible(currentUser, applicationId);

    const isMentorOrAdmin = GLOBAL_READ_ROLES.includes(currentUser.role);

    const notes = await this.prisma.note.findMany({
      where: {
        applicationId,
        deletedAt: null,
        ...(isMentorOrAdmin ? {} : { OR: [{ isInternal: false }, { userId: currentUser.id }] }),
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    return notes.map(toNoteResponse);
  }

  /** Редактирование (включая закрепление) — только автор, независимо от роли. */
  public async update(
    currentUser: SanitizedUser,
    id: string,
    dto: UpdateNoteDto,
  ): Promise<NoteResponse> {
    const note = await this.findOwnedNoteOrThrow(currentUser, id);
    const isMentorOrAdmin = GLOBAL_READ_ROLES.includes(currentUser.role);

    const updated = await this.prisma.note.update({
      where: { id: note.id },
      data: {
        content: dto.content,
        isPinned: dto.isPinned,
        isInternal: isMentorOrAdmin ? dto.isInternal : undefined,
      },
    });

    return toNoteResponse(updated);
  }

  /**
   * Удаление — автор ИЛИ Admin/SuperAdmin (модерация), но НЕ Mentor —
   * тот же принцип, что и в CalendarService: Mentor нигде не получал прав
   * на удаление ни одного ресурса согласно принятым решениям.
   */
  public async remove(currentUser: SanitizedUser, id: string): Promise<void> {
    const note = await this.findExistingNoteOrThrow(id);

    if (note.userId !== currentUser.id && !ADMIN_ROLES.includes(currentUser.role)) {
      throw new ForbiddenException('Only the author or an administrator can delete this note');
    }

    await this.prisma.note.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async findOwnedNoteOrThrow(currentUser: SanitizedUser, id: string): Promise<Note> {
    const note = await this.findExistingNoteOrThrow(id);

    if (note.userId !== currentUser.id) {
      throw new ForbiddenException('Only the author can edit this note');
    }

    return note;
  }

  private async findExistingNoteOrThrow(id: string): Promise<Note> {
    const note = await this.prisma.note.findUnique({ where: { id } });

    if (!note || note.deletedAt) {
      throw new NotFoundException('Note not found');
    }

    return note;
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
