import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Button } from '../../../components/Button/Button';
import { FormField } from '../../../components/FormField/FormField';
import { adminUsersApi } from '../../../services/adminUsersApi';
import { useAuthStore } from '../../../store/authStore';
import type { AdminUserResponse, UserRole } from '../../../types/adminUser.types';

const ALL_ROLES: UserRole[] = ['Student', 'Mentor', 'Admin', 'SuperAdmin'];
const ADMIN_PAGE_LIMIT = 50;

const createUserSchema = z.object({
  email: z.string().min(1, 'Обязательное поле'),
  password: z.string().min(8, 'Минимум 8 символов'),
  firstName: z.string().min(1, 'Обязательное поле'),
  lastName: z.string().min(1, 'Обязательное поле'),
  role: z.enum(['Student', 'Mentor', 'Admin', 'SuperAdmin']),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

const EMPTY_FORM_VALUES: CreateUserFormValues = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: 'Student',
};

/**
 * Roadmap, Этап 11.1 — путь frontend/src/pages/Admin/Users/. Backend
 * (`/admin/users`) готов с самого Этапа 11.1 — самостоятельная
 * регистрация на платформе отключена (Этап 1.1), поэтому это
 * единственный способ создать нового пользователя через интерфейс.
 */
export function UsersAdminTab(): JSX.Element {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.role === 'SuperAdmin';
  const queryKey = ['admin', 'users'];

  const [showForm, setShowForm] = useState(false);
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: [...queryKey, roleFilter, searchInput],
    queryFn: () =>
      adminUsersApi.getAll({
        limit: ADMIN_PAGE_LIMIT,
        role: roleFilter || undefined,
        search: searchInput || undefined,
      }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: EMPTY_FORM_VALUES,
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateUserFormValues) => adminUsersApi.create(values),
    onSuccess: () => {
      toast.success('Пользователь создан');
      setShowForm(false);
      reset(EMPTY_FORM_VALUES);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Не удалось создать пользователя'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      adminUsersApi.updateRole(id, role),
    onSuccess: () => {
      toast.success('Роль обновлена');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Не удалось изменить роль'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? adminUsersApi.activate(id) : adminUsersApi.deactivate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error('Не удалось изменить статус пользователя'),
  });

  const availableRoles = isSuperAdmin ? ALL_ROLES : ALL_ROLES.filter((role) => role !== 'SuperAdmin');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchInput(event.target.value)}
            placeholder="Поиск по имени или email..."
            className="rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
          />
          <select
            value={roleFilter}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setRoleFilter(event.target.value as UserRole | '')
            }
            className="rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
          >
            <option value="">Все роли</option>
            {ALL_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={() => setShowForm((prev) => !prev)} variant={showForm ? 'secondary' : 'primary'}>
          {showForm ? 'Отмена' : 'Создать пользователя'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit((values) => createMutation.mutate(values))}
          noValidate
          className="space-y-3 rounded border border-ink-100 p-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <FormField id="email" label="Email" error={errors.email?.message} {...register('email')} />
            <FormField
              id="password"
              label="Пароль"
              type="password"
              error={errors.password?.message}
              {...register('password')}
            />
            <FormField id="firstName" label="Имя" error={errors.firstName?.message} {...register('firstName')} />
            <FormField id="lastName" label="Фамилия" error={errors.lastName?.message} {...register('lastName')} />

            <div>
              <label htmlFor="role" className="mb-1 block text-sm font-medium text-ink-700">
                Роль
              </label>
              <select
                id="role"
                {...register('role')}
                className="w-full rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
              >
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              {!isSuperAdmin && (
                <p className="mt-1 text-xs text-ink-500">
                  Роль SuperAdmin может выдать только SuperAdmin.
                </p>
              )}
            </div>
          </div>

          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Создание...' : 'Создать'}
          </Button>
        </form>
      )}

      {isLoading && <p className="text-ink-500">Загрузка...</p>}
      {data && data.items.length === 0 && <p className="text-ink-500">Пользователи не найдены.</p>}

      {data && data.items.length > 0 && (
        <div className="overflow-hidden rounded border border-ink-100">
          {data.items.map((user: AdminUserResponse) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-3 py-2 last:border-b-0"
            >
              <div className={user.isActive ? '' : 'opacity-50'}>
                <p className="text-sm font-medium text-ink-900">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-ink-500">{user.email}</p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <select
                  value={user.role}
                  disabled={user.id === currentUser?.id}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    updateRoleMutation.mutate({ id: user.id, role: event.target.value as UserRole })
                  }
                  className="rounded border border-ink-200 px-2 py-1 text-xs outline-none focus:border-ink-900 disabled:opacity-50"
                >
                  {(user.role === 'SuperAdmin' && !isSuperAdmin ? [user.role] : availableRoles).map(
                    (role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ),
                  )}
                </select>

                <button
                  type="button"
                  disabled={user.id === currentUser?.id}
                  onClick={() =>
                    toggleActiveMutation.mutate({ id: user.id, isActive: !user.isActive })
                  }
                  className="text-sm text-ink-500 hover:text-danger disabled:opacity-50"
                >
                  {user.isActive ? 'Деактивировать' : 'Активировать'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
