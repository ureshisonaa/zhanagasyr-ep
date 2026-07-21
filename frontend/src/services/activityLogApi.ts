import { api } from './api';
import type { ActivityLogEntryResponse } from '../types/activityLogEntry.types';

export const activityLogApi = {
  getAllForApplication: async (
    applicationId: string,
    limit = 10,
  ): Promise<ActivityLogEntryResponse[]> => {
    const response = await api.get<{ success: true; entries: ActivityLogEntryResponse[] }>(
      `/activity-log/${applicationId}`,
      { params: { limit } },
    );
    return response.data.entries;
  },
};
