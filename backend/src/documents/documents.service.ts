import { ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import type { DocumentType, Prisma } from '@prisma/client';
import { unlink } from 'fs/promises';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { ChecklistsService } from '../checklists/checklists.service';
import { GLOBAL_READ_ROLES } from '../common/constants/roles.constant';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateDocumentStatusDto } from './dto/update-document-status.dto';
import type { DocumentResponse } from './interfaces/document-response.interface';
import { toDocumentResponse } from './utils/to-document-response.util';
import { VerificationService } from './verification/verification.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly verificationService: VerificationService,
    private readonly checklistsService: ChecklistsService,
  ) {}

  /**
   * Полный пайплайн из ТЗ (Часть 3, п.13): MIME и размер уже проверены на
   * уровне Multer (documentMulterOptions, Этап 4.1) до вызова этого метода.
   * Здесь — запись метаданных, перенос в Google Drive (Этап 4.2), обновление
   * ссылки и удаление временного файла.
   *
   * Выполняется синхронно в рамках одного HTTP-запроса — очередь фоновых
   * задач в проекте пока не используется (ТЗ её не требует), поэтому запрос
   * на загрузку файла завершается только после реального попадания файла
   * в Drive.
   */
  public async upload(
    userId: string,
    documentTypeId: string,
    file: Express.Multer.File,
  ): Promise<DocumentResponse> {
    const documentType = await this.ensureDocumentTypeExists(documentTypeId);

    const document = await this.prisma.document.create({
      data: {
        userId,
        documentTypeId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        localTempPath: file.path,
        status: 'Uploaded',
      },
    });

    try {
      const uploaded = await this.googleDriveService.uploadDocument(
        userId,
        documentTypeId,
        documentType.name,
        file.path,
        file.originalname,
        file.mimetype,
      );

      const updated = await this.prisma.document.update({
        where: { id: document.id },
        data: {
          driveFileId: uploaded.driveFileId,
          driveUrl: uploaded.driveUrl,
          driveFolderId: uploaded.driveFolderId,
          localTempPath: null,
        },
      });

      await this.tryDeleteLocalTempFile(file.path);

      // Fire-and-forget: проверка (Этап 6.1) не должна задерживать ответ на
      // запрос загрузки — vision-анализ может занять несколько секунд.
      // verifyDocument уже перехватывает все свои внутренние ошибки и
      // проставляет NeedsReview при сбое; внешний catch — защита на случай
      // непредвиденной ошибки до входа в его собственный try/catch (DI и т.п.).
      this.verificationService.verifyDocument(updated.id).catch((error: unknown) => {
        this.logger.error(
          `Unexpected error triggering verification for document ${updated.id}: ${String(error)}`,
        );
      });

      return toDocumentResponse(updated);
    } catch (error) {
      // Запись в БД и временный файл сознательно НЕ удаляются при ошибке —
      // документ остаётся в состоянии "Uploaded, ещё не в Drive", готовым
      // к повторной попытке (ретрай — будущая доработка), вместо того чтобы
      // молча потерять уже принятый от пользователя файл.
      this.logger.error(
        `Failed to upload document ${document.id} to Google Drive: ${String(error)}`,
      );
      throw new InternalServerErrorException(
        'Failed to upload document to Google Drive. Please try again.',
      );
    }
  }

  /**
   * Закрывает пробел с решением раунда 3 ("Mentor может изменять статус
   * документов") — до этого статус документа мог менять только
   * VerificationService (AI, Этап 6.1), ручного пути коррекции
   * ошибочного AI-вердикта не существовало вовсе.
   *
   * При переходе в Approved синхронизирует чек-листы (та же логика, что
   * и в VerificationService, Этап 6.2) — иначе ручное одобрение вело бы
   * себя иначе, чем автоматическое, что было бы непоследовательно.
   */
  public async updateStatusManually(
    currentUser: SanitizedUser,
    documentId: string,
    dto: UpdateDocumentStatusDto,
  ): Promise<DocumentResponse> {
    if (!GLOBAL_READ_ROLES.includes(currentUser.role)) {
      throw new ForbiddenException('Only Mentor/Admin/SuperAdmin can manually change document status');
    }

    const document = await this.prisma.document.findUnique({ where: { id: documentId } });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: dto.status,
        verificationResult: dto.verificationResult ?? document.verificationResult,
        verifiedAt: new Date(),
      },
    });

    if (dto.status === 'Approved') {
      try {
        await this.checklistsService.markItemsCompletedForApprovedDocument(
          documentId,
          document.documentTypeId,
        );
      } catch (error) {
        this.logger.warn(`Document ${documentId} manually approved, but checklist sync failed: ${String(error)}`);
      }
    }

    return toDocumentResponse(updated);
  }

  /**
   * Пагинация (Этап 12.2, ревизия существующих контроллеров) — раньше
   * список отдавался целиком без пагинации (решение Этапа 4.1: "личные
   * документы одного пользователя, а не каталог из тысяч записей"). При
   * накоплении документов через много заявок за долгое использование
   * платформы это предположение не выдерживает роста — Roadmap явно
   * называет документы в списке сущностей, требующих пагинации.
   */
  public async findAllForUser(
    userId: string,
    query: { page: number; limit: number },
  ): Promise<PaginatedResult<DocumentResponse>> {
    const { page, limit } = query;
    const where = { userId };

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      items: items.map(toDocumentResponse),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Используется ApplicationsService.create() внутри транзакции создания
   * заявки — для авто-привязки уже одобренных документов (Этап 4.3,
   * реализация точки расширения, оставленной в ChecklistsService на
   * Этапе 3.2) и авто-отметки соответствующих пунктов чек-листа.
   *
   * Если у пользователя несколько одобренных документов одного типа —
   * берём самый свежий (order by uploadedAt desc + Map перезаписывает
   * только отсутствующие ключи).
   */
  public async findApprovedDocumentsByTypeForUser(
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<Map<string, string>> {
    const documents = await tx.document.findMany({
      where: { userId, status: 'Approved' },
      orderBy: { uploadedAt: 'desc' },
    });

    const documentIdByType = new Map<string, string>();

    for (const document of documents) {
      if (!documentIdByType.has(document.documentTypeId)) {
        documentIdByType.set(document.documentTypeId, document.id);
      }
    }

    return documentIdByType;
  }

  private async ensureDocumentTypeExists(id: string): Promise<DocumentType> {
    const documentType = await this.prisma.documentType.findUnique({ where: { id } });

    if (!documentType) {
      throw new NotFoundException('Document type not found');
    }

    return documentType;
  }

  private async tryDeleteLocalTempFile(path: string): Promise<void> {
    try {
      await unlink(path);
    } catch (error) {
      // Некритично: не должно ломать успешно завершённую загрузку в Drive —
      // тот же принцип, что и при удалении старого аватара (Этап 1.3).
      this.logger.warn(`Failed to delete local temp file "${path}": ${String(error)}`);
    }
  }
}
