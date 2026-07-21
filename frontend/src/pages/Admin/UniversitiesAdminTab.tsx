import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Button } from '../../components/Button/Button';
import { FormField } from '../../components/FormField/FormField';
import { universitiesApi } from '../../services/universitiesApi';
import type { UniversityResponse } from '../../types/university.types';

const universitySchema = z.object({
  name: z.string().min(1, 'Обязательное поле').max(200),
  country: z.string().min(1, 'Обязательное поле').max(100),
  city: z.string().min(1, 'Обязательное поле').max(100),
  logo: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  ranking: z.string().optional(),
  tuition: z.string().optional(),
  currency: z.string().optional(),
});

type UniversityFormValues = z.infer<typeof universitySchema>;

const EMPTY_FORM_VALUES: UniversityFormValues = {
  name: '',
  country: '',
  city: '',
  logo: '',
  website: '',
  description: '',
  ranking: '',
  tuition: '',
  currency: '',
};

const ADMIN_PAGE_LIMIT = 50;

export function UniversitiesAdminTab(): JSX.Element {
  const queryClient = useQueryClient();
  const queryKey = ['admin', 'universities'];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => universitiesApi.getAll({ limit: ADMIN_PAGE_LIMIT, includeInactive: true }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UniversityFormValues>({
    resolver: zodResolver(universitySchema),
    defaultValues: EMPTY_FORM_VALUES,
  });

  const saveMutation = useMutation({
    mutationFn: (values: UniversityFormValues) => {
      const input = {
        name: values.name,
        country: values.country,
        city: values.city,
        logo: values.logo || undefined,
        website: values.website || undefined,
        description: values.description || undefined,
        ranking: values.ranking ? Number(values.ranking) : undefined,
        tuition: values.tuition ? Number(values.tuition) : undefined,
        currency: values.currency || undefined,
      };
      return editingId ? universitiesApi.update(editingId, input) : universitiesApi.create(input);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Университет обновлён' : 'Университет создан');
      closeForm();
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Не удалось сохранить университет'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      universitiesApi.update(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error('Не удалось изменить статус университета'),
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

  const startEdit = (university: UniversityResponse): void => {
    setEditingId(university.id);
    setShowForm(true);
  };

  // Заполняем форму данными выбранного университета, когда меняется editingId
  // (список уже загружен к этому моменту — форма открывается только по клику на существующую строку).
  const editingUniversity = data?.items.find((item) => item.id === editingId);

  useEffect(() => {
    if (editingUniversity) {
      reset({
        name: editingUniversity.name,
        country: editingUniversity.country,
        city: editingUniversity.city,
        logo: editingUniversity.logo ?? '',
        website: editingUniversity.website ?? '',
        description: editingUniversity.description ?? '',
        ranking: editingUniversity.ranking?.toString() ?? '',
        tuition: editingUniversity.tuition?.toString() ?? '',
        currency: editingUniversity.currency ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingUniversity?.id]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={showForm ? closeForm : startCreate} variant={showForm ? 'secondary' : 'primary'}>
          {showForm ? 'Отмена' : 'Добавить университет'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          noValidate
          className="space-y-3 rounded border border-ink-100 p-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <FormField id="name" label="Название" error={errors.name?.message} {...register('name')} />
            <FormField id="country" label="Страна" error={errors.country?.message} {...register('country')} />
            <FormField id="city" label="Город" error={errors.city?.message} {...register('city')} />
            <FormField id="logo" label="Логотип (URL)" error={errors.logo?.message} {...register('logo')} />
            <FormField id="website" label="Сайт" error={errors.website?.message} {...register('website')} />
            <FormField id="ranking" label="Рейтинг" type="number" error={errors.ranking?.message} {...register('ranking')} />
            <FormField id="tuition" label="Стоимость обучения" type="number" error={errors.tuition?.message} {...register('tuition')} />
            <FormField id="currency" label="Валюта (например USD)" error={errors.currency?.message} {...register('currency')} />
          </div>
          <FormField id="description" label="Описание" error={errors.description?.message} {...register('description')} />
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Сохранение...' : editingId ? 'Сохранить изменения' : 'Создать'}
          </Button>
        </form>
      )}

      {isLoading && <p className="text-ink-500">Загрузка...</p>}

      {data && (
        <div className="overflow-hidden rounded border border-ink-100">
          {data.items.map((university) => (
            <div
              key={university.id}
              className="flex items-center justify-between gap-3 border-b border-ink-100 px-3 py-2 last:border-b-0"
            >
              <div className={university.isActive ? '' : 'opacity-50'}>
                <p className="text-sm font-medium text-ink-900">{university.name}</p>
                <p className="text-xs text-ink-500">
                  {university.city}, {university.country}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-sm">
                <button type="button" onClick={() => startEdit(university)} className="text-ink-500 hover:text-ink-900">
                  Редактировать
                </button>
                <button
                  type="button"
                  onClick={() =>
                    toggleActiveMutation.mutate({ id: university.id, isActive: !university.isActive })
                  }
                  className="text-ink-500 hover:text-danger"
                >
                  {university.isActive ? 'Деактивировать' : 'Активировать'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
