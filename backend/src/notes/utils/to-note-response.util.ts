import type { Note } from '@prisma/client';
import type { NoteResponse } from '../interfaces/note-response.interface';

export function toNoteResponse(note: Note): NoteResponse {
  return {
    id: note.id,
    applicationId: note.applicationId,
    userId: note.userId,
    content: note.content,
    isPinned: note.isPinned,
    isInternal: note.isInternal,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}
