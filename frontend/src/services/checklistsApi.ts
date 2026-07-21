import { api } from './api';
import type { ChecklistItemResponse, ChecklistResponse } from '../types/checklist.types';

export const checklistsApi = {
  getByApplication: async (applicationId: string): Promise<ChecklistResponse> => {
    const response = await api.get<{ success: true; checklist: ChecklistResponse }>(
      `/checklists/${applicationId}`,
    );
    return response.data.checklist;
  },

  /** Только Mentor/Admin/SuperAdmin (backend, Этап 10.1) — закрывает пробел из решения раунда 3. */
  toggleItem: async (itemId: string, isCompleted: boolean): Promise<ChecklistItemResponse> => {
    const response = await api.put<{ success: true; item: ChecklistItemResponse }>(
      `/checklists/items/${itemId}`,
      { isCompleted },
    );
    return response.data.item;
  },
};
