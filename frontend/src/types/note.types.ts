export interface NoteResponse {
  id: string;
  applicationId: string;
  userId: string;
  content: string;
  isPinned: boolean;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}
