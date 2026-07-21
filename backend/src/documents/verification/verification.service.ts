import { Injectable, Logger } from '@nestjs/common';
import type { DocumentStatus } from '@prisma/client';
import pdfParse from 'pdf-parse';
import { ChecklistsService } from '../../checklists/checklists.service';
import { GoogleDriveService } from '../../google-drive/google-drive.service';
import { OpenAiService } from '../../openai/openai.service';
import { PrismaService } from '../../prisma/prisma.service';

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PDF_MIME_TYPE = 'application/pdf';

// Ограничение длины текста, отправляемого модели — многостраничные PDF
// (транскрипты, финансовые выписки) могут быть очень длинными.
const MAX_EXTRACTED_TEXT_LENGTH = 10_000;

const VALID_STATUSES: readonly DocumentStatus[] = ['Approved', 'Rejected', 'NeedsReview'];

const RESPONSE_FORMAT_INSTRUCTIONS = `Ответь СТРОГО в формате JSON без дополнительного текста и без markdown-обёртки:
{"status": "Approved" | "Rejected" | "NeedsReview", "explanation": "краткое объяснение на русском языке"}

Approved — документ чёткий/читаемый и соответствует заявленному типу.
Rejected — документ явно повреждён, нечитаем, либо явно не соответствует заявленному типу.
NeedsReview — есть сомнения, требуется проверка человеком (наставником или администратором).`;

interface VerificationVerdict {
  status: DocumentStatus;
  explanation: string;
}

/**
 * Пайплайн (ТЗ, Часть 1, §22): после загрузки документа автоматически
 * создаётся задача проверки -> ИИ извлекает текст (OCR для изображений при
 * необходимости) -> проверяет соответствие типу -> выявляет ошибки ->
 * сохраняет результат -> Approved/Rejected/NeedsReview.
 *
 * Запускается из DocumentsService.upload() асинхронно (fire-and-forget) —
 * не блокирует ответ на запрос загрузки файла. Каждая внутренняя ошибка
 * перехватывается и приводит к статусу NeedsReview с объяснением, а не
 * падает молча — документ никогда не остаётся забытым в статусе Checking.
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly openAiService: OpenAiService,
    private readonly checklistsService: ChecklistsService,
  ) {}

  public async verifyDocument(documentId: string): Promise<void> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { documentType: true },
    });

    if (!document) {
      this.logger.warn(`verifyDocument called for non-existent document ${documentId}`);
      return;
    }

    if (!document.driveFileId) {
      this.logger.warn(`Document ${documentId} has no driveFileId yet — skipping verification`);
      return;
    }

    await this.prisma.document.update({ where: { id: documentId }, data: { status: 'Checking' } });

    try {
      const verdict = await this.analyze(document.driveFileId, document.mimeType, document.documentType.name);

      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: verdict.status, verificationResult: verdict.explanation, verifiedAt: new Date() },
      });

      // Этап 6.2: документ может быть привязан к нескольким заявкам
      // (переиспользуемые документы) — метод сам находит все и отмечает
      // соответствующие пункты чек-листа. Только для Approved — Rejected/
      // NeedsReview не должны ничего отмечать как выполненное.
      //
      // Отдельный try/catch: сбой синхронизации чек-листа НЕ должен попасть
      // во внешний catch и перезаписать уже корректно определённый статус
      // Approved на NeedsReview — сама проверка документа прошла успешно,
      // неудачным может быть только этот вторичный побочный эффект.
      if (verdict.status === 'Approved') {
        try {
          await this.checklistsService.markItemsCompletedForApprovedDocument(
            documentId,
            document.documentTypeId,
          );
        } catch (syncError) {
          this.logger.error(
            `Document ${documentId} approved, but checklist sync failed: ${String(syncError)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Document verification failed for ${documentId}: ${String(error)}`);

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'NeedsReview',
          verificationResult:
            'Автоматическая проверка завершилась технической ошибкой. Требуется ручная проверка.',
          verifiedAt: new Date(),
        },
      });
    }
  }

  private async analyze(
    driveFileId: string,
    mimeType: string,
    documentTypeName: string,
  ): Promise<VerificationVerdict> {
    if (IMAGE_MIME_TYPES.includes(mimeType)) {
      return this.analyzeImage(driveFileId, mimeType, documentTypeName);
    }

    if (mimeType === PDF_MIME_TYPE) {
      return this.analyzePdf(driveFileId, documentTypeName);
    }

    // DOC/DOCX — честное ограничение: надёжный парсинг старого формата
    // Word требует отдельной специализированной библиотеки, которую
    // невозможно проверить в этой среде без сети. Не притворяемся, что
    // анализ произошёл — сразу отдаём на ручную проверку.
    return {
      status: 'NeedsReview',
      explanation:
        'Автоматический анализ DOC/DOCX пока не поддерживается — требуется ручная проверка.',
    };
  }

  private async analyzeImage(
    driveFileId: string,
    mimeType: string,
    documentTypeName: string,
  ): Promise<VerificationVerdict> {
    const buffer = await this.googleDriveService.downloadFile(driveFileId);
    const base64 = buffer.toString('base64');

    const instructions = [
      `Ты проверяешь скан/фото документа для поступления в университет.`,
      `Ожидаемый тип документа: "${documentTypeName}".`,
      '',
      'Проверь по изображению:',
      '1. Читаемость — можно ли разобрать текст?',
      '2. Соответствие заявленному типу документа.',
      '3. Признаки просроченности, если применимо (например виза/сертификат с датой действия).',
      '',
      RESPONSE_FORMAT_INSTRUCTIONS,
    ].join('\n');

    const rawResponse = await this.openAiService.analyzeDocumentImage(base64, mimeType, instructions);
    return this.parseVerdict(rawResponse);
  }

  private async analyzePdf(driveFileId: string, documentTypeName: string): Promise<VerificationVerdict> {
    const buffer = await this.googleDriveService.downloadFile(driveFileId);
    const parsed = await pdfParse(buffer);
    const extractedText = parsed.text.slice(0, MAX_EXTRACTED_TEXT_LENGTH);

    if (extractedText.trim().length === 0) {
      return {
        status: 'NeedsReview',
        explanation: 'Из PDF не удалось извлечь текст (возможно, это скан без текстового слоя) — требуется ручная проверка.',
      };
    }

    const instructions = [
      `Ты проверяешь текст, извлечённый из документа для поступления в университет.`,
      `Ожидаемый тип документа: "${documentTypeName}".`,
      '',
      'Текст документа:',
      '"""',
      extractedText,
      '"""',
      '',
      'Проверь:',
      '1. Соответствие заявленному типу документа по содержанию.',
      '2. Признаки того, что документ повреждён/обрезан/нечитаем (бессвязный или пустой текст).',
      '3. Признаки просроченности, если применимо.',
      '',
      RESPONSE_FORMAT_INSTRUCTIONS,
    ].join('\n');

    const completion = await this.openAiService.createChatCompletion([
      { role: 'user', content: instructions },
    ]);

    return this.parseVerdict(completion.content);
  }

  private parseVerdict(rawResponse: string): VerificationVerdict {
    try {
      const cleaned = rawResponse.trim().replace(/^```(json)?\s*|```$/g, '');
      const parsed = JSON.parse(cleaned) as { status?: string; explanation?: string };
      const status = this.normalizeStatus(parsed.status);

      return { status, explanation: parsed.explanation ?? 'Объяснение не предоставлено.' };
    } catch {
      return {
        status: 'NeedsReview',
        explanation: `Не удалось разобрать ответ AI-проверки. Требуется ручная проверка. Сырой ответ: ${rawResponse.slice(0, 500)}`,
      };
    }
  }

  private normalizeStatus(value: string | undefined): DocumentStatus {
    const candidate = VALID_STATUSES.find((status) => status === value);
    return candidate ?? 'NeedsReview';
  }
}
