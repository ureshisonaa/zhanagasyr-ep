import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'fs';
import { drive_v3, google } from 'googleapis';
import type { GoogleDriveConfig } from '../config/google-drive.config';
import { PrismaService } from '../prisma/prisma.service';

export interface UploadedDriveFile {
  driveFileId: string;
  driveUrl: string;
  driveFolderId: string;
}

const STUDENTS_ROOT_FOLDER_NAME = 'Students';
const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private readonly drive: drive_v3.Drive;

  /**
   * In-memory кэш ID папки "Students" на время жизни процесса — экономит
   * один Drive API запрос на КАЖДУЮ загрузку любого пользователя.
   * Ограничение: при горизонтальном масштабировании (несколько инстансов
   * backend) возможна гонка при "холодном" старте и создание дублей папки
   * "Students". Приемлемо для монолитного MVP-деплоя (ТЗ, Часть 2, п.15);
   * при переходе на несколько инстансов потребуется вынести в общий кэш
   * (например Redis) или создать папку заранее вручную и задать её ID
   * через GOOGLE_DRIVE_ROOT_FOLDER_ID.
   */
  private studentsRootFolderIdCache: string | null = null;

  public constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const config = this.configService.get<GoogleDriveConfig>('googleDrive');

    if (!config?.clientEmail || !config.privateKey) {
      this.logger.warn(
        'Google Drive credentials are not configured (GOOGLE_DRIVE_CLIENT_EMAIL / ' +
          'GOOGLE_DRIVE_PRIVATE_KEY) — document uploads will fail until they are set.',
      );
    }

    const auth = new google.auth.JWT({
      email: config?.clientEmail,
      key: config?.privateKey,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    this.drive = google.drive({ version: 'v3', auth });
  }

  /**
   * Полный пайплайн загрузки одного файла: находит/создаёт нужную подпапку
   * пользователя (Students/{userId}/{DocumentType}/), загружает файл,
   * возвращает driveFileId/driveUrl/driveFolderId.
   *
   * НЕ удаляет локальный временный файл — это ответственность вызывающего
   * кода (DocumentsService), чтобы сервис оставался чистым адаптером к
   * внешнему API без побочных эффектов на файловую систему.
   */
  public async uploadDocument(
    userId: string,
    documentTypeId: string,
    documentTypeName: string,
    localFilePath: string,
    fileName: string,
    mimeType: string,
  ): Promise<UploadedDriveFile> {
    const folderId = await this.ensureDocumentTypeFolder(userId, documentTypeId, documentTypeName);

    const response = await this.drive.files.create({
      requestBody: { name: fileName, parents: [folderId] },
      media: { mimeType, body: createReadStream(localFilePath) },
      fields: 'id, webViewLink',
    });

    const driveFileId = response.data.id;
    const driveUrl = response.data.webViewLink;

    if (!driveFileId || !driveUrl) {
      throw new Error('Google Drive did not return a file id/url for the uploaded document');
    }

    return { driveFileId, driveUrl, driveFolderId: folderId };
  }

  /** Кэш в UserDriveFolder (Postgres) — переживает рестарты, в отличие от in-memory кэша "Students". */
  /** Используется DocumentVerificationService (Этап 6.1) — файл после Этапа 4.2 живёт только в Drive. */
  public async downloadFile(fileId: string): Promise<Buffer> {
    const response = await this.drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' },
    );

    return Buffer.from(response.data as ArrayBuffer);
  }

  private async ensureDocumentTypeFolder(
    userId: string,
    documentTypeId: string,
    documentTypeName: string,
  ): Promise<string> {
    const cached = await this.prisma.userDriveFolder.findUnique({
      where: { userId_documentTypeId: { userId, documentTypeId } },
    });

    if (cached) {
      return cached.driveFolderId;
    }

    const rootFolderId = await this.ensureUserRootFolder(userId);
    const subfolderId = await this.findOrCreateFolder(documentTypeName, rootFolderId);

    await this.prisma.userDriveFolder.create({
      data: { userId, documentTypeId, driveFolderId: subfolderId },
    });

    return subfolderId;
  }

  private async ensureUserRootFolder(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (user?.driveRootFolderId) {
      return user.driveRootFolderId;
    }

    const studentsFolderId = await this.ensureStudentsRootFolder();
    const userFolderId = await this.findOrCreateFolder(userId, studentsFolderId);

    await this.prisma.user.update({
      where: { id: userId },
      data: { driveRootFolderId: userFolderId },
    });

    return userFolderId;
  }

  private async ensureStudentsRootFolder(): Promise<string> {
    if (this.studentsRootFolderIdCache) {
      return this.studentsRootFolderIdCache;
    }

    const config = this.configService.get<GoogleDriveConfig>('googleDrive');
    // Опционально: если задан GOOGLE_DRIVE_ROOT_FOLDER_ID, папка "Students"
    // создаётся/ищется внутри него, а не в корне всего Drive-аккаунта.
    const parentId = config?.rootFolderId;

    const folderId = await this.findOrCreateFolder(STUDENTS_ROOT_FOLDER_NAME, parentId);
    this.studentsRootFolderIdCache = folderId;

    return folderId;
  }

  private async findOrCreateFolder(name: string, parentId?: string | null): Promise<string> {
    const queryParts = [
      `name = '${this.escapeForDriveQuery(name)}'`,
      `mimeType = '${DRIVE_FOLDER_MIME_TYPE}'`,
      'trashed = false',
    ];

    if (parentId) {
      queryParts.push(`'${parentId}' in parents`);
    }

    const existing = await this.drive.files.list({
      q: queryParts.join(' and '),
      fields: 'files(id, name)',
      pageSize: 1,
    });

    const existingFolderId = existing.data.files?.[0]?.id;

    if (existingFolderId) {
      return existingFolderId;
    }

    const created = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: DRIVE_FOLDER_MIME_TYPE,
        parents: parentId ? [parentId] : undefined,
      },
      fields: 'id',
    });

    if (!created.data.id) {
      throw new Error(`Failed to create Google Drive folder "${name}"`);
    }

    return created.data.id;
  }

  private escapeForDriveQuery(value: string): string {
    return value.replace(/'/g, "\\'");
  }
}
