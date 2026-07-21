import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { FiBookmark } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Button } from '../../../components/Button/Button';
import { mentorCommentsApi } from '../../../services/mentorCommentsApi';
import { notesApi } from '../../../services/notesApi';
import { useAuthStore } from '../../../store/authStore';
import type { NoteResponse } from '../../../types/note.types';

interface NotesTabProps {
  applicationId: string;
}

const MENTOR_ROLES = ['Mentor', 'Admin', 'SuperAdmin'];

export function NotesTab({ applicationId }: NotesTabProps): JSX.Element {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const queryKey = ['notes', applicationId];

  const [newContent, setNewContent] = useState('');
  const [newIsInternal, setNewIsInternal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [newCommentContent, setNewCommentContent] = useState('');
  const [newCommentIsInternal, setNewCommentIsInternal] = useState(false);
  const commentsQueryKey = ['mentor-comments', applicationId];

  const {
    data: notes,
    isLoading,
    isError,
  } = useQuery({
    queryKey,
    queryFn: () => notesApi.getAllForApplication(applicationId),
  });

  const createMutation = useMutation({
    mutationFn: () => notesApi.create(applicationId, { content: newContent.trim(), isInternal: newIsInternal }),
    onSuccess: () => {
      setNewContent('');
      setNewIsInternal(false);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Не удалось создать заметку'),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; content?: string; isPinned?: boolean }) =>
      notesApi.update(input.id, { content: input.content, isPinned: input.isPinned }),
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Не удалось обновить заметку'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notesApi.remove(id),
    onSuccess: () => {
      toast.success('Заметка удалена');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Не удалось удалить заметку'),
  });

  const { data: mentorComments } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: () => mentorCommentsApi.getAllForApplication(applicationId),
  });

  const createCommentMutation = useMutation({
    mutationFn: () =>
      mentorCommentsApi.create({
        applicationId,
        content: newCommentContent.trim(),
        isInternal: newCommentIsInternal,
      }),
    onSuccess: () => {
      setNewCommentContent('');
      setNewCommentIsInternal(false);
      queryClient.invalidateQueries({ queryKey: commentsQueryKey });
    },
    onError: () => toast.error('Не удалось добавить комментарий'),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: string) => mentorCommentsApi.remove(id),
    onSuccess: () => {
      toast.success('Комментарий удалён');
      queryClient.invalidateQueries({ queryKey: commentsQueryKey });
    },
    onError: () => toast.error('Не удалось удалить комментарий'),
  });

  const canCreateInternal = MENTOR_ROLES.includes(currentUser?.role ?? '');

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (newContent.trim()) {
      createMutation.mutate();
    }
  };

  const startEditing = (note: NoteResponse): void => {
    setEditingId(note.id);
    setEditingContent(note.content);
  };

  const saveEditing = (): void => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, content: editingContent });
    }
  };

  const handleCreateComment = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (newCommentContent.trim()) {
      createCommentMutation.mutate();
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreateSubmit} className="space-y-2 rounded border border-ink-100 p-4">
        <textarea
          value={newContent}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNewContent(event.target.value)}
          placeholder="Новая заметка..."
          rows={3}
          className="w-full rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
        />
        <div className="flex items-center justify-between">
          {canCreateInternal ? (
            <label className="flex items-center gap-2 text-xs text-ink-500">
              <input
                type="checkbox"
                checked={newIsInternal}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setNewIsInternal(event.target.checked)}
              />
              Только для наставников
            </label>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={!newContent.trim() || createMutation.isPending}>
            {createMutation.isPending ? 'Сохранение...' : 'Добавить заметку'}
          </Button>
        </div>
      </form>

      {isLoading && <p className="text-ink-500">Загрузка...</p>}
      {isError && <p className="text-danger">Не удалось загрузить заметки.</p>}
      {notes && notes.length === 0 && <p className="text-ink-500">Заметок пока нет.</p>}

      {notes && notes.length > 0 && (
        <div className="space-y-2">
          {notes.map((note) => {
            const isAuthor = note.userId === currentUser?.id;

            return (
              <div key={note.id} className="rounded border border-ink-100 p-3">
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingContent}
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                        setEditingContent(event.target.value)
                      }
                      rows={3}
                      className="w-full rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
                    />
                    <div className="flex gap-2">
                      <Button onClick={saveEditing} disabled={updateMutation.isPending}>
                        Сохранить
                      </Button>
                      <Button variant="secondary" onClick={() => setEditingId(null)}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="whitespace-pre-wrap text-sm text-ink-900">{note.content}</p>
                      {note.isPinned && (
                        <FiBookmark
                          className="h-4 w-4 shrink-0 text-warning"
                          aria-label="Закреплено"
                        />
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                      <span>{new Date(note.createdAt).toLocaleDateString('ru-RU')}</span>
                      {note.isInternal && (
                        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-ink-700">
                          Только для наставников
                        </span>
                      )}
                      {isAuthor && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              updateMutation.mutate({ id: note.id, isPinned: !note.isPinned })
                            }
                            className="hover:text-ink-900"
                          >
                            {note.isPinned ? 'Открепить' : 'Закрепить'}
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditing(note)}
                            className="hover:text-ink-900"
                          >
                            Редактировать
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(note.id)}
                            className="hover:text-danger"
                          >
                            Удалить
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <section className="space-y-3 border-t border-ink-100 pt-4">
        <h2 className="text-sm font-medium text-ink-700">Комментарии наставника</h2>

        {canCreateInternal && (
          <form
            onSubmit={handleCreateComment}
            className="space-y-2 rounded border border-ink-100 p-4"
          >
            <textarea
              value={newCommentContent}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setNewCommentContent(event.target.value)
              }
              placeholder="Новый комментарий..."
              rows={3}
              className="w-full rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-ink-500">
                <input
                  type="checkbox"
                  checked={newCommentIsInternal}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setNewCommentIsInternal(event.target.checked)
                  }
                />
                Только для наставников
              </label>
              <Button
                type="submit"
                disabled={!newCommentContent.trim() || createCommentMutation.isPending}
              >
                {createCommentMutation.isPending ? 'Отправка...' : 'Добавить комментарий'}
              </Button>
            </div>
          </form>
        )}

        {mentorComments && mentorComments.length === 0 && (
          <p className="text-sm text-ink-500">Комментариев пока нет.</p>
        )}

        {mentorComments && mentorComments.length > 0 && (
          <div className="space-y-2">
            {mentorComments.map((comment) => {
              const isCommentAuthor = comment.authorId === currentUser?.id;

              return (
                <div key={comment.id} className="rounded border border-ink-100 p-3">
                  <p className="whitespace-pre-wrap text-sm text-ink-900">{comment.content}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                    <span>{comment.authorName}</span>
                    <span>{new Date(comment.createdAt).toLocaleDateString('ru-RU')}</span>
                    {comment.isInternal && (
                      <span className="rounded-full bg-ink-100 px-2 py-0.5 text-ink-700">
                        Только для наставников
                      </span>
                    )}
                    {isCommentAuthor && (
                      <button
                        type="button"
                        onClick={() => deleteCommentMutation.mutate(comment.id)}
                        className="hover:text-danger"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
