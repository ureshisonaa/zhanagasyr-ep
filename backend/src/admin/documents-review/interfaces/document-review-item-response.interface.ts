export interface DocumentReviewItemResponse {
  id: string;
  fileName: string;
  documentTypeName: string;
  studentName: string;
  status: string;
  verificationResult: string | null;
  driveUrl: string | null;
  uploadedAt: Date;
}
