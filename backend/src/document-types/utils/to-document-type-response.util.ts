import type { DocumentType } from '@prisma/client';
import type { DocumentTypeResponse } from '../interfaces/document-type-response.interface';

export function toDocumentTypeResponse(documentType: DocumentType): DocumentTypeResponse {
  return {
    id: documentType.id,
    name: documentType.name,
    description: documentType.description,
    isActive: documentType.isActive,
  };
}
