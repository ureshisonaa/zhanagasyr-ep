import { api } from './api';
import type { ProgressResponse } from '../types/progress.types';

export const progressApi = {
  getForApplication: async (applicationId: string): Promise<ProgressResponse> => {
    const response = await api.get<{ success: true; progress: ProgressResponse }>(
      `/progress/${applicationId}`,
    );
    return response.data.progress;
  },
};
