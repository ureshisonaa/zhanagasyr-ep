import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Button } from '../../components/Button/Button';
import { FormField } from '../../components/FormField/FormField';
import { aiPromptsApi } from '../../services/aiPromptsApi';
import type { AiPromptResponse } from '../../types/aiPrompt.types';

const promptSchema = z.object({
  name: z.string().min(1, 'Обязательное поле').max(100),
  description: z.string().optional(),
  prompt: z.string().min(1, 'Обязательное поле'),
});

type PromptFormValues = z.infer<typeof promptSchema>;

const EMPTY_FORM_VALUES: PromptFormValues = { name: '', description: '', prompt: '' };

export function AiPromptsAdminTab(): JSX.Element {
  const queryClient = useQueryClient();
  const queryKey = ['admin', 'ai-prompts'];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => aiPromptsApi.getAll(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PromptFormValues>({
    resolver: zodResolver(promptSchema),
    defaultValues: EMPTY_FORM_VALUES,
  });

  const saveMutation = useMutation({
    mutationFn: (values: PromptFormValues) => {
      const input = {
        name: values.name,
        description: values.description || undefined,
        prompt: values.prompt,
      };
      return editingId ? aiPromptsApi.update(editingId, input) : aiPromptsApi.create(input);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Промпт обновлён' : 'Промпт создан');
      closeForm();
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Не удалось сохранить промпт'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => aiPromptsApi.remove(id),
    onSuccess: () => {
      toast.success('Промпт удалён — используется встроенный по умолчанию');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Не удалось удалить промпт'),
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

  const startEdit = (prompt: AiPromptResponse): void => {
    setEditingId(prompt.id);
    setShowForm(true);
  };

  const editingPrompt = data?.find((item) => item.id === editingId);

  useEffect(() => {
    if (editingPrompt) {
      reset({
        name: editingPrompt.name,
        description: editingPrompt.description ?? '',
        prompt: editingPrompt.prompt,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingPrompt?.id]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-500">
        Системный промпт AI-чата ищется по имени <code>chat_system_prompt</code>. Если запись с
        таким именем не создана — используется встроенный по умолчанию.
      </p>

      <div className="flex justify-end">
        <Button onClick={showForm ? closeForm : startCreate} variant={showForm ? 'secondary' : 'primary'}>
          {showForm ? 'Отмена' : 'Добавить промпт'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          noValidate
          className="space-y-3 rounded border border-ink-100 p-4"
        >
          <FormField id="name" label="Ключ (name)" error={errors.name?.message} {...register('name')} />
          <FormField id="description" label="Описание" error={errors.description?.message} {...register('description')} />
          <div>
            <label htmlFor="prompt" className="mb-1 block text-sm font-medium text-ink-700">
              Текст промпта
            </label>
            <textarea
              id="prompt"
              rows={8}
              {...register('prompt')}
              className="w-full rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
            />
            {errors.prompt && <p className="mt-1 text-sm text-danger">{errors.prompt.message}</p>}
          </div>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Сохранение...' : editingId ? 'Сохранить изменения' : 'Создать'}
          </Button>
        </form>
      )}

      {isLoading && <p className="text-ink-500">Загрузка...</p>}
      {data && data.length === 0 && <p className="text-ink-500">Промптов пока нет — используются встроенные по умолчанию.</p>}

      {data && data.length > 0 && (
        <div className="space-y-2">
          {data.map((prompt) => (
            <div key={prompt.id} className="rounded border border-ink-100 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-ink-900">{prompt.name}</p>
                  {prompt.description && <p className="text-xs text-ink-500">{prompt.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <button type="button" onClick={() => startEdit(prompt)} className="text-ink-500 hover:text-ink-900">
                    Редактировать
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMutation.mutate(prompt.id)}
                    className="text-ink-500 hover:text-danger"
                  >
                    Удалить
                  </button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-xs text-ink-500">{prompt.prompt}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
