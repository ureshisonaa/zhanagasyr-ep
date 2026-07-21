import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import type { UpdateDocumentTypeDto } from './dto/update-document-type.dto';
import type { DocumentTypeResponse } from './interfaces/document-type-response.interface';
import { toDocumentTypeResponse } from './utils/to-document-type-response.util';

const ADMIN_ROLES = ['Admin', 'SuperAdmin'];

@Injectable()
export class DocumentTypesService {
  public constructor(private readonly prisma: PrismaService) {}

  /**
   * По умолчанию — только isActive=true (справочник для формы загрузки
   * документа, Этап 4.4, не должен предлагать деактивированные типы).
   * Admin с includeInactive=true видит и деактивированные — тот же принцип,
   * что и у University/Program/AdmissionCycle (Этап 11.2).
   */
  public async findAll(
    currentUser: SanitizedUser,
    includeInactive?: boolean,
  ): Promise<DocumentTypeResponse[]> {
    const canSeeInactive = includeInactive && ADMIN_ROLES.includes(currentUser.role);

    const documentTypes = await this.prisma.documentType.findMany({
      where: canSeeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });

    return documentTypes.map(toDocumentTypeResponse);
  }

  public async create(dto: CreateDocumentTypeDto): Promise<DocumentTypeResponse> {
    try {
      const documentType = await this.prisma.documentType.create({ data: dto });
      return toDocumentTypeResponse(documentType);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A document type with this name already exists');
      }
      throw error;
    }
  }

  public async update(id: string, dto: UpdateDocumentTypeDto): Promise<DocumentTypeResponse> {
    await this.ensureExists(id);

    try {
      const documentType = await this.prisma.documentType.update({ where: { id }, data: dto });
      return toDocumentTypeResponse(documentType);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A document type with this name already exists');
      }
      throw error;
    }
  }

  /** Soft-delete — hard delete нарушил бы FK с Document/ProgramRequirement (см. комментарий в схеме). */
  public async softDelete(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.documentType.update({ where: { id }, data: { isActive: false } });
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.documentType.findUnique({ where: { id } });

    if (!exists) {
      throw new NotFoundException('Document type not found');
    }
  }
}
