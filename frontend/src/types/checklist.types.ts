export interface ChecklistItemResponse {
  id: string;
  label: string;
  documentTypeId: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  completedBy: string | null;
  createdAt: string;
}

export interface ChecklistResponse {
  id: string;
  applicationId: string;
  items: ChecklistItemResponse[];
  createdAt: string;
  updatedAt: string;
}
