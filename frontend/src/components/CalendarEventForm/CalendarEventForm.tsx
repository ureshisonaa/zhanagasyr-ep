import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Button } from '../Button/Button';
import { FormField } from '../FormField/FormField';
import {
  EVENT_PRIORITIES,
  EVENT_PRIORITY_LABELS,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
} from '../../constants/calendarEvent.constants';
import { calendarApi } from '../../services/calendarApi';

interface CalendarEventFormProps {
  applicationId?: string;
  onCreated: () => void;
}

const calendarEventSchema = z.object({
  title: z.string().min(1, 'Обязательное поле').max(300),
  description: z.string().optional(),
  type: z.enum([
    'IELTS',
    'SAT',
    'Deadline',
    'Interview',
    'Visa',
    'Meeting',
    'Reminder',
    'Application',
    'Other',
  ]),
  date: z.string().min(1, 'Укажите дату'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
});

type CalendarEventFormValues = z.infer<typeof calendarEventSchema>;

export function CalendarEventForm({ applicationId, onCreated }: CalendarEventFormProps): JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CalendarEventFormValues>({
    resolver: zodResolver(calendarEventSchema),
    defaultValues: { type: 'Other', priority: 'Medium' },
  });

  const mutation = useMutation({
    mutationFn: (values: CalendarEventFormValues) =>
      calendarApi.create({ ...values, applicationId }),
    onSuccess: () => {
      toast.success('Событие добавлено');
      reset();
      onCreated();
    },
    onError: () => toast.error('Не удалось создать событие'),
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      noValidate
      className="space-y-3 rounded border border-ink-100 p-4"
    >
      <FormField id="title" label="Название" error={errors.title?.message} {...register('title')} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="type" className="mb-1 block text-sm font-medium text-ink-700">
            Тип
          </label>
          <select
            id="type"
            {...register('type')}
            className="w-full rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {EVENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="priority" className="mb-1 block text-sm font-medium text-ink-700">
            Приоритет
          </label>
          <select
            id="priority"
            {...register('priority')}
            className="w-full rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
          >
            {EVENT_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {EVENT_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <FormField id="date" label="Дата" type="date" error={errors.date?.message} {...register('date')} />

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Добавление...' : 'Добавить событие'}
      </Button>
    </form>
  );
}
