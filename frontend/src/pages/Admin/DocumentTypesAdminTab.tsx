import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Button } from '../../components/Button/Button';
import { FormField } from '../../components/FormField/FormField';
import { documentTypesApi } from '../../services/documentTypesApi';
import type { DocumentTypeResponse } from '../../types/documentType.types';

const documentTypeSchema = z.object({
  name: z.string().min(1, 'Обязательное поле').max(100),
  description: z.string().optional(),
});

type DocumentTypeFormValues = z.infer<typeof documentTypeSchema>;

const EMPTY_FORM_VALUES: DocumentTypeFormValues = { name: '', description: '' };

export function DocumentTypesAdminTab(): JSX.Element {
  const queryClient = useQueryClient();
  const queryKey = ['admin', 'document-types'];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => documentTypesApi.getAll(true),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentTypeFormValues>({
    resolver: zodResolver(documentTypeSchema),
    defaultValues: EMPTY_FORM_VALUES,
  });

  const saveMutation = useMutation({
    mutationFn: (values: DocumentTypeFormValues) => {
      const input = { name: values.name, description: values.description || undefined };
      return editingId
        ? documentTypesApi.update(editingId, input)
        : documentTypesApi.create(input);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Вид документа обновлён' : 'Вид документа создан');
      closeForm();
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Не удалось сохранить вид документа'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      documentTypesApi.update(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error('Не удалось изменить статус'),
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

  const startEdit = (documentType: DocumentTypeResponse): void => {
    setEditingId(documentType.id);
    setShowForm(true);
  };

  const editingType = data?.find((item) => item.id === editingId);

  useEffect(() => {
    if (editingType) {
      reset({ name: editingType.name, description: editingType.description ?? '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingType?.id]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={showForm ? closeForm : startCreate} variant={showForm ? 'secondary' : 'primary'}>
          {showForm ? 'Отмена' : 'Добавить вид документа'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          noValidate
          className="space-y-3 rounded border border-ink-100 p-4"
        >
          <FormField id="name" label="Название" error={errors.name?.message} {...register('name')} />
          <FormField id="description" label="Описание" error={errors.description?.message} {...register('description')} />
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Сохранение...' : editingId ? 'Сохранить изменения' : 'Создать'}
          </Button>
        </form>
      )}

      {isLoading && <p className="text-ink-500">Загрузка...</p>}

      {data && (
        <div className="overflow-hidden rounded border border-ink-100">
          {data.map((documentType) => (
            <div
              key={documentType.id}
              className="flex items-center justify-between gap-3 border-b border-ink-100 px-3 py-2 last:border-b-0"
            >
              <div className={documentType.isActive ? '' : 'opacity-50'}>
                <p className="text-sm font-medium text-ink-900">{documentType.name}</p>
                {documentType.description && (
                  <p className="text-xs text-ink-500">{documentType.description}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => startEdit(documentType)}
                  className="text-ink-500 hover:text-ink-900"
                >
                  Редактировать
                </button>
                <button
                  type="button"
                  onClick={() =>
                    toggleActiveMutation.mutate({
                      id: documentType.id,
                      isActive: !documentType.isActive,
                    })
                  }
                  className="text-ink-500 hover:text-danger"
                >
                  {documentType.isActive ? 'Деактивировать' : 'Активировать'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
