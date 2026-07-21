import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Button } from '../../../components/Button/Button';
import { FormField } from '../../../components/FormField/FormField';
import { usersApi } from '../../../services/usersApi';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Обязательное поле'),
    newPassword: z
      .string()
      .min(8, 'Минимум 8 символов')
      .regex(/(?=.*[A-Za-z])(?=.*\d)/, 'Пароль должен содержать буквы и цифры'),
    confirmPassword: z.string().min(1, 'Обязательное поле'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export function PasswordSection(): JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

  const mutation = useMutation({
    mutationFn: (values: PasswordFormValues) =>
      usersApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      toast.success('Пароль изменён');
      reset();
    },
    onError: () => toast.error('Не удалось изменить пароль. Проверьте текущий пароль.'),
  });

  return (
    <section>
      <h2 className="mb-4 text-lg font-medium text-ink-900">Смена пароля</h2>
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
        className="space-y-4"
      >
        <FormField
          id="currentPassword"
          label="Текущий пароль"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <FormField
          id="newPassword"
          label="Новый пароль"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <FormField
          id="confirmPassword"
          label="Подтверждение нового пароля"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Сохранение...' : 'Изменить пароль'}
        </Button>
      </form>
    </section>
  );
}
