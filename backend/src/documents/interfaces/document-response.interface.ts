export interface DocumentResponse {
  id: string;
  documentTypeId: string;
  fileName: string;
  mimeType: string;
  size: number;
  status: string;
  /** Реальная ссылка на файл в Google Drive — появляется после Этапа 4.2. */
  driveUrl: string | null;
  verificationResult: string | null;
  verifiedAt: Date | null;
  uploadedAt: Date;
}
