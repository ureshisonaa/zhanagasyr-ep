import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Button } from '../../../components/Button/Button';
import { FormField } from '../../../components/FormField/FormField';
import { usersApi } from '../../../services/usersApi';
import { useAuthStore } from '../../../store/authStore';
import type { FullProfile } from '../../../types/user.types';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Обязательное поле').max(100),
  lastName: z.string().min(1, 'Обязательное поле').max(100),
  phone: z.union([z.string().regex(/^\+?[0-9]{7,15}$/, 'Некорректный формат телефона'), z.literal('')]),
  country: z.string().max(100),
  city: z.string().max(100),
  birthDate: z.string(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileSectionProps {
  profile: FullProfile;
}

export function ProfileSection({ profile }: ProfileSectionProps): JSX.Element {
  const queryClient = useQueryClient();
  const updateUserFields = useAuthStore((state) => state.updateUserFields);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone ?? '',
      country: profile.country ?? '',
      city: profile.city ?? '',
      birthDate: profile.birthDate ? profile.birthDate.slice(0, 10) : '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      usersApi.updateProfile({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone || undefined,
        country: values.country || undefined,
        city: values.city || undefined,
        birthDate: values.birthDate || undefined,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['profile'], updated);
      updateUserFields({ firstName: updated.firstName, lastName: updated.lastName });
      toast.success('Профиль обновлён');
    },
    onError: () => toast.error('Не удалось обновить профиль'),
  });

  return (
    <section>
      <h2 className="mb-4 text-lg font-medium text-ink-900">Личные данные</h2>
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField id="firstName" label="Имя" error={errors.firstName?.message} {...register('firstName')} />
          <FormField id="lastName" label="Фамилия" error={errors.lastName?.message} {...register('lastName')} />
        </div>

        <FormField id="phone" label="Телефон" error={errors.phone?.message} {...register('phone')} />

        <div className="grid grid-cols-2 gap-4">
          <FormField id="country" label="Страна" {...register('country')} />
          <FormField id="city" label="Город" {...register('city')} />
        </div>

        <FormField id="birthDate" label="Дата рождения" type="date" {...register('birthDate')} />

        <Button type="submit" disabled={mutation.isPending || !isDirty}>
          {mutation.isPending ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </form>
    </section>
  );
}
