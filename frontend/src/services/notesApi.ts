import { api } from './api';
import type { NoteResponse } from '../types/note.types';

export interface CreateNoteInput {
  content: string;
  isPinned?: boolean;
  isInternal?: boolean;
}

export interface UpdateNoteInput {
  content?: string;
  isPinned?: boolean;
  isInternal?: boolean;
}

export const notesApi = {
  getAllForApplication: async (applicationId: string): Promise<NoteResponse[]> => {
    const response = await api.get<{ success: true; notes: NoteResponse[] }>(
      `/notes/${applicationId}`,
    );
    return response.data.notes;
  },

  create: async (applicationId: string, input: CreateNoteInput): Promise<NoteResponse> => {
    const response = await api.post<{ success: true; note: NoteResponse }>(
      `/notes/${applicationId}`,
      input,
    );
    return response.data.note;
  },

  update: async (id: string, input: UpdateNoteInput): Promise<NoteResponse> => {
    const response = await api.put<{ success: true; note: NoteResponse }>(`/notes/${id}`, input);
    return response.data.note;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/notes/${id}`);
  },
};
