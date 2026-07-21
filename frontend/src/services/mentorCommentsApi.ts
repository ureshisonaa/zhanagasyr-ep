import { api } from './api';
import type { MentorCommentResponse } from '../types/mentorComment.types';

export interface CreateMentorCommentInput {
  applicationId?: string;
  documentId?: string;
  content: string;
  isInternal?: boolean;
}

export const mentorCommentsApi = {
  getAllForApplication: async (applicationId: string): Promise<MentorCommentResponse[]> => {
    const response = await api.get<{ success: true; comments: MentorCommentResponse[] }>(
      `/mentor-comments/application/${applicationId}`,
    );
    return response.data.comments;
  },

  create: async (input: CreateMentorCommentInput): Promise<MentorCommentResponse> => {
    const response = await api.post<{ success: true; comment: MentorCommentResponse }>(
      '/mentor-comments',
      input,
    );
    return response.data.comment;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/mentor-comments/${id}`);
  },
};
