export interface ChecklistItemResponse {
  id: string;
  label: string;
  documentTypeId: string | null;
  isCompleted: boolean;
  completedAt: Date | null;
  completedBy: string | null;
  createdAt: Date;
}
