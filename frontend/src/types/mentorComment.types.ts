export interface MentorCommentResponse {
  id: string;
  applicationId: string | null;
  documentId: string | null;
  authorId: string;
  authorName: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}
