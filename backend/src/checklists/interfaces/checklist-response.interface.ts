import type { ChecklistItemResponse } from './checklist-item-response.interface';

export interface ChecklistResponse {
  id: string;
  applicationId: string;
  items: ChecklistItemResponse[];
  createdAt: Date;
  updatedAt: Date;
}
