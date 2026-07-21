import type { Checklist, ChecklistItem } from '@prisma/client';
import type { ChecklistItemResponse } from '../interfaces/checklist-item-response.interface';
import type { ChecklistResponse } from '../interfaces/checklist-response.interface';

export function toChecklistItemResponse(item: ChecklistItem): ChecklistItemResponse {
  return {
    id: item.id,
    label: item.label,
    documentTypeId: item.documentTypeId,
    isCompleted: item.isCompleted,
    completedAt: item.completedAt,
    completedBy: item.completedBy,
    createdAt: item.createdAt,
  };
}

export function toChecklistResponse(
  checklist: Checklist & { items: ChecklistItem[] },
): ChecklistResponse {
  return {
    id: checklist.id,
    applicationId: checklist.applicationId,
    items: checklist.items.map(toChecklistItemResponse),
    createdAt: checklist.createdAt,
    updatedAt: checklist.updatedAt,
  };
}
