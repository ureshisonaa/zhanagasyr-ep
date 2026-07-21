import type { ApplicationDocument, Document } from '@prisma/client';
import type { ApplicationDocumentResponse } from '../interfaces/application-document-response.interface';

export function toApplicationDocumentResponse(
  link: ApplicationDocument & { document: Document },
): ApplicationDocumentResponse {
  return {
    id: link.id,
    applicationId: link.applicationId,
    documentId: link.documentId,
    isShared: link.isShared,
    addedAt: link.addedAt,
    document: {
      id: link.document.id,
      fileName: link.document.fileName,
      documentTypeId: link.document.documentTypeId,
      status: link.document.status,
      driveUrl: link.document.driveUrl,
      verificationResult: link.document.verificationResult,
    },
  };
}
