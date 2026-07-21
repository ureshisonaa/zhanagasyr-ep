import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import { DOCUMENT_STATUS_LABELS, StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { applicationDocumentsApi } from '../../services/applicationDocumentsApi';
import { applicationsApi } from '../../services/applicationsApi';
import { checklistsApi } from '../../services/checklistsApi';
import { documentsApi } from '../../services/documentsApi';
import { mentorCommentsApi } from '../../services/mentorCommentsApi';
import { useAuthStore } from '../../store/authStore';

const DOCUMENT_STATUSES = Object.keys(DOCUMENT_STATUS_LABELS);

export function ApplicationReview(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const applicationId = id ?? '';
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  const [commentContent, setCommentContent] = useState('');
  const [commentIsInternal, setCommentIsInternal] = useState(false);

  const { data: application } = useQuery({
    queryKey: ['applications', applicationId],
    queryFn: () => applicationsApi.getOne(applicationId),
    enabled: Boolean(applicationId),
  });

  const { data: checklist } = useQuery({
    queryKey: ['checklist', applicationId],
    queryFn: () => checklistsApi.getByApplication(applicationId),
    enabled: Boolean(applicationId),
  });

  const { data: applicationDocuments } = useQuery({
    queryKey: ['application-documents', applicationId],
    queryFn: () => applicationDocumentsApi.getAllForApplication(applicationId),
    enabled: Boolean(applicationId),
  });

  const { data: comments } = useQuery({
    queryKey: ['mentor-comments', applicationId],
    queryFn: () => mentorCommentsApi.getAllForApplication(applicationId),
    enabled: Boolean(applicationId),
  });

  const toggleItemMutation = useMutation({
    mutationFn: ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) =>
      checklistsApi.toggleItem(itemId, isCompleted),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checklist', applicationId] }),
    onError: () => toast.error('Не удалось изменить пункт чек-листа'),
  });

  const updateDocStatusMutation = useMutation({
    mutationFn: ({ documentId, status }: { documentId: string; status: string }) =>
      documentsApi.updateStatus(documentId, status),
    onSuccess: () => {
      toast.success('Статус документа обновлён');
      queryClient.invalidateQueries({ queryKey: ['application-documents', applicationId] });
    },
    onError: () => toast.error('Не удалось изменить статус документа'),
  });

  const createCommentMutation = useMutation({
    mutationFn: () =>
      mentorCommentsApi.create({
        applicationId,
        content: commentContent.trim(),
        isInternal: commentIsInternal,
      }),
    onSuccess: () => {
      setCommentContent('');
      setCommentIsInternal(false);
      queryClient.invalidateQueries({ queryKey: ['mentor-comments', applicationId] });
    },
    onError: () => toast.error('Не удалось добавить комментарий'),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => mentorCommentsApi.remove(commentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mentor-comments', applicationId] }),
    onError: () => toast.error('Не удалось удалить комментарий'),
  });

  const handleCommentSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (commentContent.trim()) {
      createCommentMutation.mutate();
    }
  };

  if (!application) {
    return <p className="px-6 py-10 text-ink-500">Загрузка...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <div>
        <Link
          to={`/mentor/students/${application.userId}`}
          className="text-sm text-ink-500 hover:text-ink-900"
        >
          ← Заявки студента
        </Link>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{application.title}</h1>
          <span className="shrink-0 rounded-full bg-ink-100 px-3 py-1 text-sm font-medium text-ink-700">
            {application.currentStageLabel}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-500">{application.studentName}</p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-medium text-ink-900">Чек-лист</h2>

        {!checklist && <p className="text-sm text-ink-500">Загрузка...</p>}
        {checklist && checklist.items.length === 0 && (
          <p className="text-sm text-ink-500">Пунктов чек-листа нет.</p>
        )}

        {checklist && checklist.items.length > 0 && (
          <div className="space-y-1 rounded border border-ink-100 p-2">
            {checklist.items.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-3 rounded px-2 py-2 hover:bg-ink-50"
              >
                <input
                  type="checkbox"
                  checked={item.isCompleted}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    toggleItemMutation.mutate({ itemId: item.id, isCompleted: event.target.checked })
                  }
                />
                <span
                  className={`text-sm ${item.isCompleted ? 'text-ink-400 line-through' : 'text-ink-900'}`}
                >
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-ink-900">Документы</h2>

        {!applicationDocuments && <p className="text-sm text-ink-500">Загрузка...</p>}
        {applicationDocuments && applicationDocuments.length === 0 && (
          <p className="text-sm text-ink-500">Документов пока нет.</p>
        )}

        {applicationDocuments && applicationDocuments.length > 0 && (
          <div className="space-y-2">
            {applicationDocuments.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between gap-3 rounded border border-ink-100 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{link.document.fileName}</p>
                  {link.document.verificationResult && (
                    <p className="mt-1 text-xs text-ink-500">{link.document.verificationResult}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={link.document.status} />
                  <select
                    value={link.document.status}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      updateDocStatusMutation.mutate({
                        documentId: link.document.id,
                        status: event.target.value,
                      })
                    }
                    className="rounded border border-ink-200 px-2 py-1 text-xs outline-none focus:border-ink-900"
                  >
                    {DOCUMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {DOCUMENT_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-ink-900">Комментарии</h2>

        <form onSubmit={handleCommentSubmit} className="space-y-2 rounded border border-ink-100 p-4">
          <textarea
            value={commentContent}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setCommentContent(event.target.value)}
            placeholder="Оставьте комментарий по заявке..."
            rows={3}
            className="w-full rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-ink-500">
              <input
                type="checkbox"
                checked={commentIsInternal}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setCommentIsInternal(event.target.checked)
                }
              />
              Только для наставников (студент не увидит)
            </label>
            <Button type="submit" disabled={!commentContent.trim() || createCommentMutation.isPending}>
              {createCommentMutation.isPending ? 'Отправка...' : 'Добавить комментарий'}
            </Button>
          </div>
        </form>

        {comments && comments.length === 0 && (
          <p className="text-sm text-ink-500">Комментариев пока нет.</p>
        )}

        {comments && comments.length > 0 && (
          <div className="space-y-2">
            {comments.map((comment) => (
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
                  {comment.authorId === currentUser?.id && (
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
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
