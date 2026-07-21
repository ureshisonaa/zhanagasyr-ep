export interface DocumentResponse {
  id: string;
  documentTypeId: string;
  fileName: string;
  mimeType: string;
  size: number;
  status: string;
  driveUrl: string | null;
  verificationResult: string | null;
  verifiedAt: string | null;
  uploadedAt: string;
}
