import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Button } from '../../components/Button/Button';
import { FormField } from '../../components/FormField/FormField';
import { programRequirementsApi } from '../../services/programRequirementsApi';
import { programsApi } from '../../services/programsApi';
import { universitiesApi } from '../../services/universitiesApi';
import type { DegreeLevel, ProgramResponse } from '../../types/program.types';

const DEGREE_LEVELS: DegreeLevel[] = ['Bachelor', 'Master', 'PhD', 'Certificate'];
const ADMIN_PAGE_LIMIT = 50;

const programSchema = z.object({
  universityId: z.string().min(1, 'Выберите университет'),
  name: z.string().min(1, 'Обязательное поле').max(200),
  degreeLevel: z.enum(['Bachelor', 'Master', 'PhD', 'Certificate']),
  description: z.string().optional(),
  duration: z.string().optional(),
});

type ProgramFormValues = z.infer<typeof programSchema>;

const EMPTY_FORM_VALUES: ProgramFormValues = {
  universityId: '',
  name: '',
  degreeLevel: 'Bachelor',
  description: '',
  duration: '',
};

export function ProgramsAdminTab(): JSX.Element {
  const queryClient = useQueryClient();
  const queryKey = ['admin', 'programs'];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);

  const { data: universities } = useQuery({
    queryKey: ['universities', 'for-select'],
    queryFn: () => universitiesApi.getAll({ limit: 100 }),
  });

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => programsApi.getAll({ limit: ADMIN_PAGE_LIMIT, includeInactive: true }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: EMPTY_FORM_VALUES,
  });

  const saveMutation = useMutation({
    mutationFn: (values: ProgramFormValues) => {
      const input = {
        universityId: values.universityId,
        name: values.name,
        degreeLevel: values.degreeLevel,
        description: values.description || undefined,
        duration: values.duration || undefined,
      };
      return editingId ? programsApi.update(editingId, input) : programsApi.create(input);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Программа обновлена' : 'Программа создана');
      closeForm();
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Не удалось сохранить программу'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      programsApi.update(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error('Не удалось изменить статус программы'),
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

  const startEdit = (program: ProgramResponse): void => {
    setEditingId(program.id);
    setShowForm(true);
  };

  const editingProgram = data?.items.find((item) => item.id === editingId);

  useEffect(() => {
    if (editingProgram) {
      reset({
        universityId: editingProgram.universityId,
        name: editingProgram.name,
        degreeLevel: editingProgram.degreeLevel,
        description: editingProgram.description ?? '',
        duration: editingProgram.duration ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingProgram?.id]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={showForm ? closeForm : startCreate} variant={showForm ? 'secondary' : 'primary'}>
          {showForm ? 'Отмена' : 'Добавить программу'}
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
              <label htmlFor="degreeLevel" className="mb-1 block text-sm font-medium text-ink-700">
                Уровень
              </label>
              <select
                id="degreeLevel"
                {...register('degreeLevel')}
                className="w-full rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
              >
                {DEGREE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <FormField id="name" label="Название" error={errors.name?.message} {...register('name')} />
            <FormField id="duration" label="Длительность" error={errors.duration?.message} {...register('duration')} />
          </div>
          <FormField id="description" label="Описание" error={errors.description?.message} {...register('description')} />
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Сохранение...' : editingId ? 'Сохранить изменения' : 'Создать'}
          </Button>
        </form>
      )}

      {isLoading && <p className="text-ink-500">Загрузка...</p>}

      {data && (
        <div className="space-y-2">
          {data.items.map((program) => (
            <div key={program.id} className="rounded border border-ink-100">
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <div className={program.isActive ? '' : 'opacity-50'}>
                  <p className="text-sm font-medium text-ink-900">{program.name}</p>
                  <p className="text-xs text-ink-500">{program.degreeLevel}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedProgramId((prev) => (prev === program.id ? null : program.id))
                    }
                    className="text-ink-500 hover:text-ink-900"
                  >
                    {expandedProgramId === program.id ? 'Скрыть требования' : 'Требования'}
                  </button>
                  <button type="button" onClick={() => startEdit(program)} className="text-ink-500 hover:text-ink-900">
                    Редактировать
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      toggleActiveMutation.mutate({ id: program.id, isActive: !program.isActive })
                    }
                    className="text-ink-500 hover:text-danger"
                  >
                    {program.isActive ? 'Деактивировать' : 'Активировать'}
                  </button>
                </div>
              </div>

              {expandedProgramId === program.id && <ProgramRequirementsPanel programId={program.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ProgramRequirementsPanelProps {
  programId: string;
}

const requirementSchema = z.object({
  label: z.string().min(1, 'Обязательное поле').max(200),
  isRequired: z.boolean(),
  order: z.string().optional(),
});

type RequirementFormValues = z.infer<typeof requirementSchema>;

function ProgramRequirementsPanel({ programId }: ProgramRequirementsPanelProps): JSX.Element {
  const queryClient = useQueryClient();
  const queryKey = ['admin', 'program-requirements', programId];

  const { data: requirements, isLoading } = useQuery({
    queryKey,
    queryFn: () => programRequirementsApi.getAllForProgram(programId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RequirementFormValues>({
    resolver: zodResolver(requirementSchema),
    defaultValues: { label: '', isRequired: true, order: '' },
  });

  const createMutation = useMutation({
    mutationFn: (values: RequirementFormValues) =>
      programRequirementsApi.create(programId, {
        label: values.label,
        isRequired: values.isRequired,
        order: values.order ? Number(values.order) : undefined,
      }),
    onSuccess: () => {
      reset({ label: '', isRequired: true, order: '' });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Не удалось добавить требование'),
  });

  const removeMutation = useMutation({
    mutationFn: (requirementId: string) => programRequirementsApi.remove(programId, requirementId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error('Не удалось удалить требование'),
  });

  return (
    <div className="space-y-3 border-t border-ink-100 bg-ink-50 p-3">
      {isLoading && <p className="text-sm text-ink-500">Загрузка...</p>}
      {requirements && requirements.length === 0 && (
        <p className="text-sm text-ink-500">Требований пока нет.</p>
      )}

      {requirements && requirements.length > 0 && (
        <ul className="space-y-1">
          {requirements.map((requirement) => (
            <li key={requirement.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-ink-900">
                {requirement.label}{' '}
                {!requirement.isRequired && <span className="text-ink-400">(опционально)</span>}
              </span>
              <button
                type="button"
                onClick={() => removeMutation.mutate(requirement.id)}
                className="text-ink-400 hover:text-danger"
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={handleSubmit((values) => createMutation.mutate(values))}
        noValidate
        className="flex flex-wrap items-end gap-2"
      >
        <FormField id="label" label="Название требования" error={errors.label?.message} {...register('label')} />
        <label className="flex items-center gap-1 pb-2 text-xs text-ink-500">
          <input type="checkbox" defaultChecked {...register('isRequired')} />
          Обязательно
        </label>
        <Button type="submit" variant="secondary" disabled={createMutation.isPending}>
          Добавить
        </Button>
      </form>
    </div>
  );
}
