export interface ApplicationDocumentResponse {
  id: string;
  applicationId: string;
  documentId: string;
  isShared: boolean;
  addedAt: string;
  document: {
    id: string;
    fileName: string;
    documentTypeId: string;
    status: string;
    driveUrl: string | null;
    verificationResult: string | null;
  };
}
