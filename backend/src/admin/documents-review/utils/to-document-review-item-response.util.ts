import type { Document, DocumentType, User } from '@prisma/client';
import type { DocumentReviewItemResponse } from '../interfaces/document-review-item-response.interface';

type DocumentWithRelations = Document & {
  user?: Pick<User, 'firstName' | 'lastName'>;
  documentType?: Pick<DocumentType, 'name'>;
};

export function toDocumentReviewItemResponse(
  document: DocumentWithRelations,
): DocumentReviewItemResponse {
  // user/documentType помечены опциональными в типе Prisma-клиента (он не
  // умеет статически отражать, что include реально был передан), но здесь
  // ГАРАНТИРОВАННО присутствуют — DocumentsReviewService.findAll всегда
  // запрашивает их через include.
  const user = document.user!;
  const documentType = document.documentType!;

  return {
    id: document.id,
    fileName: document.fileName,
    documentTypeName: documentType.name,
    studentName: `${user.firstName} ${user.lastName}`,
    status: document.status,
    verificationResult: document.verificationResult,
    driveUrl: document.driveUrl,
    uploadedAt: document.uploadedAt,
  };
}
