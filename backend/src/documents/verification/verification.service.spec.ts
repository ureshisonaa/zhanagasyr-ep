import type { ChecklistsService } from '../../checklists/checklists.service';
import type { GoogleDriveService } from '../../google-drive/google-drive.service';
import type { OpenAiService } from '../../openai/openai.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { VerificationService } from './verification.service';

jest.mock('pdf-parse');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockedPdfParse = require('pdf-parse') as jest.Mock;

/**
 * Roadmap, Этап 13.1: VerificationService выбран не случайно — это
 * единственный сервис, чья ошибка ведёт себя по-разному в зависимости от
 * ТИПА сбоя (сбой самой AI-проверки vs сбой вторичной синхронизации
 * чек-листа), и именно эту границу однажды сломал сам разработчик
 * (Этап 6.2) — прямой кандидат для регрессионного теста.
 */
describe('VerificationService', () => {
  let verificationService: VerificationService;
  let prisma: { document: { findUnique: jest.Mock; update: jest.Mock } };
  let googleDriveService: { downloadFile: jest.Mock };
  let openAiService: { analyzeDocumentImage: jest.Mock; createChatCompletion: jest.Mock };
  let checklistsService: { markItemsCompletedForApprovedDocument: jest.Mock };

  const baseDocument = {
    id: 'doc-1',
    driveFileId: 'drive-file-1',
    documentTypeId: 'type-1',
    mimeType: 'image/jpeg',
    documentType: { name: 'Passport' },
  };

  beforeEach(() => {
    prisma = {
      document: {
        findUnique: jest.fn().mockResolvedValue(baseDocument),
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    googleDriveService = { downloadFile: jest.fn().mockResolvedValue(Buffer.from('fake-bytes')) };
    openAiService = {
      analyzeDocumentImage: jest.fn(),
      createChatCompletion: jest.fn(),
    };
    checklistsService = { markItemsCompletedForApprovedDocument: jest.fn().mockResolvedValue(undefined) };

    verificationService = new VerificationService(
      prisma as unknown as PrismaService,
      googleDriveService as unknown as GoogleDriveService,
      openAiService as unknown as OpenAiService,
      checklistsService as unknown as ChecklistsService,
    );

    jest.clearAllMocks();
    prisma.document.findUnique.mockResolvedValue(baseDocument);
    prisma.document.update.mockResolvedValue(undefined);
    googleDriveService.downloadFile.mockResolvedValue(Buffer.from('fake-bytes'));
    checklistsService.markItemsCompletedForApprovedDocument.mockResolvedValue(undefined);
  });

  it('корректно завершается без вызовов, если документ не найден', async () => {
    prisma.document.findUnique.mockResolvedValue(null);

    await verificationService.verifyDocument('missing-doc');

    expect(prisma.document.update).not.toHaveBeenCalled();
  });

  it('корректно завершается без вызовов, если у документа ещё нет driveFileId', async () => {
    prisma.document.findUnique.mockResolvedValue({ ...baseDocument, driveFileId: null });

    await verificationService.verifyDocument('doc-1');

    expect(prisma.document.update).not.toHaveBeenCalled();
    expect(googleDriveService.downloadFile).not.toHaveBeenCalled();
  });

  it('изображение с валидным вердиктом Approved — обновляет статус и синхронизирует чек-лист', async () => {
    openAiService.analyzeDocumentImage.mockResolvedValue(
      JSON.stringify({ status: 'Approved', explanation: 'Документ чёткий и читаемый.' }),
    );

    await verificationService.verifyDocument('doc-1');

    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'Approved', verificationResult: 'Документ чёткий и читаемый.' }),
      }),
    );
    expect(checklistsService.markItemsCompletedForApprovedDocument).toHaveBeenCalledWith(
      'doc-1',
      'type-1',
    );
  });

  it('изображение с вердиктом Rejected — НЕ синхронизирует чек-лист', async () => {
    openAiService.analyzeDocumentImage.mockResolvedValue(
      JSON.stringify({ status: 'Rejected', explanation: 'Документ повреждён.' }),
    );

    await verificationService.verifyDocument('doc-1');

    expect(checklistsService.markItemsCompletedForApprovedDocument).not.toHaveBeenCalled();
  });

  it('DOC/DOCX — честно помечает NeedsReview без единого вызова AI', async () => {
    prisma.document.findUnique.mockResolvedValue({
      ...baseDocument,
      mimeType: 'application/msword',
    });

    await verificationService.verifyDocument('doc-1');

    expect(openAiService.analyzeDocumentImage).not.toHaveBeenCalled();
    expect(openAiService.createChatCompletion).not.toHaveBeenCalled();
    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'NeedsReview' }) }),
    );
  });

  it('PDF с текстовым содержимым — анализирует через createChatCompletion', async () => {
    prisma.document.findUnique.mockResolvedValue({ ...baseDocument, mimeType: 'application/pdf' });
    mockedPdfParse.mockResolvedValue({ text: 'Текст паспорта, извлечённый из PDF.' });
    openAiService.createChatCompletion.mockResolvedValue({
      content: JSON.stringify({ status: 'Approved', explanation: 'Соответствует типу.' }),
    });

    await verificationService.verifyDocument('doc-1');

    expect(openAiService.createChatCompletion).toHaveBeenCalled();
    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'Approved' }) }),
    );
  });

  it('PDF без текстового слоя (скан) — NeedsReview без вызова AI', async () => {
    prisma.document.findUnique.mockResolvedValue({ ...baseDocument, mimeType: 'application/pdf' });
    mockedPdfParse.mockResolvedValue({ text: '   ' });

    await verificationService.verifyDocument('doc-1');

    expect(openAiService.createChatCompletion).not.toHaveBeenCalled();
    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'NeedsReview' }) }),
    );
  });

  it('невалидный JSON от модели — не падает, а честно откатывается на NeedsReview с сырым ответом', async () => {
    openAiService.analyzeDocumentImage.mockResolvedValue('это не JSON вовсе');

    await verificationService.verifyDocument('doc-1');

    const updateCall = prisma.document.update.mock.calls.find(
      (call) => call[0].data.status === 'NeedsReview',
    );

    expect(updateCall).toBeDefined();
    expect(updateCall![0].data.verificationResult).toContain('это не JSON вовсе');
  });

  it('технический сбой при анализе (например Google Drive недоступен) — откатывается на NeedsReview с общим сообщением', async () => {
    googleDriveService.downloadFile.mockRejectedValue(new Error('Drive API unavailable'));

    await verificationService.verifyDocument('doc-1');

    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'NeedsReview',
          verificationResult: expect.stringContaining('техническ'),
        }),
      }),
    );
  });

  /**
   * Регрессионный тест: этот именно баг был найден и исправлен на Этапе
   * 6.2 — синхронизация чек-листа изначально была внутри общего try/catch
   * verifyDocument(), из-за чего её сбой перезаписывал уже корректно
   * определённый статус Approved на NeedsReview. Отдельный try/catch
   * должен гарантировать, что это больше не произойдёт.
   */
  it('сбой синхронизации чек-листа НЕ портит уже корректно определённый статус Approved', async () => {
    openAiService.analyzeDocumentImage.mockResolvedValue(
      JSON.stringify({ status: 'Approved', explanation: 'Всё в порядке.' }),
    );
    checklistsService.markItemsCompletedForApprovedDocument.mockRejectedValue(
      new Error('Checklist sync failed'),
    );

    await verificationService.verifyDocument('doc-1');

    // Статус должен остаться Approved — НЕ NeedsReview, несмотря на сбой синхронизации.
    const statusUpdateCalls = prisma.document.update.mock.calls.filter(
      (call) => call[0].data.status !== undefined,
    );
    const finalStatusCall = statusUpdateCalls[statusUpdateCalls.length - 1];

    expect(finalStatusCall[0].data.status).toBe('Approved');
  });
});
