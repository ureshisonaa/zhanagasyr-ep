import type { Document } from '@prisma/client';
import type { DocumentResponse } from '../interfaces/document-response.interface';

export function toDocumentResponse(document: Document): DocumentResponse {
  return {
    id: document.id,
    documentTypeId: document.documentTypeId,
    fileName: document.fileName,
    mimeType: document.mimeType,
    size: document.size,
    status: document.status,
    driveUrl: document.driveUrl,
    verificationResult: document.verificationResult,
    verifiedAt: document.verifiedAt,
    uploadedAt: document.uploadedAt,
  };
}
