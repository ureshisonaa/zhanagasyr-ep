import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Button } from '../../components/Button/Button';
import { FormField } from '../../components/FormField/FormField';
import { admissionCyclesApi } from '../../services/admissionCyclesApi';
import type { AdmissionCycleResponse, AdmissionSeason } from '../../types/admissionCycle.types';

const SEASONS: AdmissionSeason[] = ['Fall', 'Spring', 'Summer', 'Winter'];
const ADMIN_PAGE_LIMIT = 50;

const cycleSchema = z.object({
  name: z.string().min(1, 'Обязательное поле').max(100),
  season: z.enum(['Fall', 'Spring', 'Summer', 'Winter']),
  year: z.string().min(1, 'Обязательное поле'),
  startDate: z.string().min(1, 'Укажите дату начала'),
  endDate: z.string().min(1, 'Укажите дату окончания'),
});

type CycleFormValues = z.infer<typeof cycleSchema>;

const EMPTY_FORM_VALUES: CycleFormValues = {
  name: '',
  season: 'Fall',
  year: new Date().getFullYear().toString(),
  startDate: '',
  endDate: '',
};

export function AdmissionCyclesAdminTab(): JSX.Element {
  const queryClient = useQueryClient();
  const queryKey = ['admin', 'admission-cycles'];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => admissionCyclesApi.getAll({ limit: ADMIN_PAGE_LIMIT, includeInactive: true }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CycleFormValues>({
    resolver: zodResolver(cycleSchema),
    defaultValues: EMPTY_FORM_VALUES,
  });

  const saveMutation = useMutation({
    mutationFn: (values: CycleFormValues) => {
      const input = {
        name: values.name,
        season: values.season,
        year: Number(values.year),
        startDate: values.startDate,
        endDate: values.endDate,
      };
      return editingId
        ? admissionCyclesApi.update(editingId, input)
        : admissionCyclesApi.create(input);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Цикл обновлён' : 'Цикл создан');
      closeForm();
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Не удалось сохранить цикл поступления'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      admissionCyclesApi.update(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error('Не удалось изменить статус цикла'),
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

  const startEdit = (cycle: AdmissionCycleResponse): void => {
    setEditingId(cycle.id);
    setShowForm(true);
  };

  const editingCycle = data?.items.find((item) => item.id === editingId);

  useEffect(() => {
    if (editingCycle) {
      reset({
        name: editingCycle.name,
        season: editingCycle.season,
        year: editingCycle.year.toString(),
        startDate: editingCycle.startDate.slice(0, 10),
        endDate: editingCycle.endDate.slice(0, 10),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCycle?.id]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={showForm ? closeForm : startCreate} variant={showForm ? 'secondary' : 'primary'}>
          {showForm ? 'Отмена' : 'Добавить цикл'}
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
            <div>
              <label htmlFor="season" className="mb-1 block text-sm font-medium text-ink-700">
                Сезон
              </label>
              <select
                id="season"
                {...register('season')}
                className="w-full rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
              >
                {SEASONS.map((season) => (
                  <option key={season} value={season}>
                    {season}
                  </option>
                ))}
              </select>
            </div>
            <FormField id="year" label="Год" type="number" error={errors.year?.message} {...register('year')} />
            <FormField id="startDate" label="Начало" type="date" error={errors.startDate?.message} {...register('startDate')} />
            <FormField id="endDate" label="Окончание" type="date" error={errors.endDate?.message} {...register('endDate')} />
          </div>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Сохранение...' : editingId ? 'Сохранить изменения' : 'Создать'}
          </Button>
        </form>
      )}

      {isLoading && <p className="text-ink-500">Загрузка...</p>}

      {data && (
        <div className="overflow-hidden rounded border border-ink-100">
          {data.items.map((cycle) => (
            <div
              key={cycle.id}
              className="flex items-center justify-between gap-3 border-b border-ink-100 px-3 py-2 last:border-b-0"
            >
              <div className={cycle.isActive ? '' : 'opacity-50'}>
                <p className="text-sm font-medium text-ink-900">{cycle.name}</p>
                <p className="text-xs text-ink-500">
                  {new Date(cycle.startDate).toLocaleDateString('ru-RU')} —{' '}
                  {new Date(cycle.endDate).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-sm">
                <button type="button" onClick={() => startEdit(cycle)} className="text-ink-500 hover:text-ink-900">
                  Редактировать
                </button>
                <button
                  type="button"
                  onClick={() => toggleActiveMutation.mutate({ id: cycle.id, isActive: !cycle.isActive })}
                  className="text-ink-500 hover:text-danger"
                >
                  {cycle.isActive ? 'Деактивировать' : 'Активировать'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
