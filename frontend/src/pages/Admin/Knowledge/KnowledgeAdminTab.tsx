import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Button } from '../../../components/Button/Button';
import { FormField } from '../../../components/FormField/FormField';
import { knowledgeApi } from '../../../services/knowledgeApi';
import { universitiesApi } from '../../../services/universitiesApi';
import type { KnowledgeArticleResponse, KnowledgeCategory } from '../../../types/knowledgeArticle.types';

const CATEGORIES: KnowledgeCategory[] = [
  'Admission',
  'Scholarships',
  'Housing',
  'Visa',
  'Requirements',
  'Programs',
  'Deadlines',
  'FinancialAid',
  'FAQ',
  'Contacts',
  'Dormitory',
];

const ADMIN_PAGE_LIMIT = 50;

const articleSchema = z.object({
  universityId: z.string().min(1, 'Выберите университет'),
  title: z.string().min(1, 'Обязательное поле').max(300),
  category: z.enum([
    'Admission',
    'Scholarships',
    'Housing',
    'Visa',
    'Requirements',
    'Programs',
    'Deadlines',
    'FinancialAid',
    'FAQ',
    'Contacts',
    'Dormitory',
  ]),
  content: z.string().min(1, 'Обязательное поле'),
  source: z.string().min(1, 'Обязательное поле').max(500),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

const EMPTY_FORM_VALUES: ArticleFormValues = {
  universityId: '',
  title: '',
  category: 'FAQ',
  content: '',
  source: '',
};

/** Roadmap, Этап 11.3 — путь frontend/src/pages/Admin/Knowledge/ (Admin-панель, вкладка). */
export function KnowledgeAdminTab(): JSX.Element {
  const queryClient = useQueryClient();
  const queryKey = ['admin', 'knowledge'];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: universities } = useQuery({
    queryKey: ['universities', 'for-select'],
    queryFn: () => universitiesApi.getAll({ limit: 100 }),
  });

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => knowledgeApi.getAll({ limit: ADMIN_PAGE_LIMIT }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: EMPTY_FORM_VALUES,
  });

  const saveMutation = useMutation({
    mutationFn: (values: ArticleFormValues) =>
      editingId ? knowledgeApi.update(editingId, values) : knowledgeApi.create(values),
    onSuccess: () => {
      toast.success(editingId ? 'Статья обновлена' : 'Статья создана');
      closeForm();
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Не удалось сохранить статью'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => knowledgeApi.remove(id),
    onSuccess: () => {
      toast.success('Статья удалена');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Не удалось удалить статью'),
  });

  const reindexMutation = useMutation({
    mutationFn: (id: string) => knowledgeApi.reindex(id),
    onSuccess: () => {
      toast.success('Статья переиндексирована');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Не удалось переиндексировать статью'),
  });

  const closeForm = (): void => {
    setShowForm(false);
    setEditingId(null);
    reset(EMPTY_FORM_VALUES);
  };

  const startCreate = (): void => {
    reset(EMPTY_FORM_VALUES);
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (article: KnowledgeArticleResponse): void => {
    setEditingId(article.id);
    setShowForm(true);
  };

  const editingArticle = data?.items.find((item) => item.id === editingId);

  useEffect(() => {
    if (editingArticle) {
      reset({
        universityId: editingArticle.universityId,
        title: editingArticle.title,
        category: editingArticle.category,
        content: editingArticle.content,
        source: editingArticle.source,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingArticle?.id]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={showForm ? closeForm : startCreate} variant={showForm ? 'secondary' : 'primary'}>
          {showForm ? 'Отмена' : 'Добавить статью'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          noValidate
          className="space-y-3 rounded border border-ink-100 p-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="universityId" className="mb-1 block text-sm font-medium text-ink-700">
                Университет
              </label>
              <select
                id="universityId"
                {...register('universityId')}
                className="w-full rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
              >
                <option value="">Выберите...</option>
                {universities?.items.map((university) => (
                  <option key={university.id} value={university.id}>
                    {university.name}
                  </option>
                ))}
              </select>
              {errors.universityId && (
                <p className="mt-1 text-sm text-danger">{errors.universityId.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="category" className="mb-1 block text-sm font-medium text-ink-700">
                Категория
              </label>
              <select
                id="category"
                {...register('category')}
                className="w-full rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <FormField id="title" label="Заголовок" error={errors.title?.message} {...register('title')} />
          <FormField id="source" label="Источник" error={errors.source?.message} {...register('source')} />

          <div>
            <label htmlFor="content" className="mb-1 block text-sm font-medium text-ink-700">
              Текст статьи
            </label>
            <textarea
              id="content"
              rows={8}
              {...register('content')}
              className="w-full rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
            />
            {errors.content && <p className="mt-1 text-sm text-danger">{errors.content.message}</p>}
          </div>

          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Сохранение...' : editingId ? 'Сохранить изменения' : 'Создать'}
          </Button>
        </form>
      )}

      {isLoading && <p className="text-ink-500">Загрузка...</p>}
      {data && data.items.length === 0 && <p className="text-ink-500">Статей пока нет.</p>}

      {data && data.items.length > 0 && (
        <div className="space-y-2">
          {data.items.map((article) => (
            <div key={article.id} className="rounded border border-ink-100 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{article.title}</p>
                  <p className="text-xs text-ink-500">
                    {article.category} · {article.source}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    article.isIndexed ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                  }`}
                >
                  {article.isIndexed ? 'Проиндексирована' : 'Не проиндексирована'}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => startEdit(article)}
                  className="text-ink-500 hover:text-ink-900"
                >
                  Редактировать
                </button>
                <button
                  type="button"
                  onClick={() => reindexMutation.mutate(article.id)}
                  disabled={reindexMutation.isPending}
                  className="text-ink-500 hover:text-ink-900"
                >
                  Переиндексировать
                </button>
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(article.id)}
                  className="text-ink-500 hover:text-danger"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
