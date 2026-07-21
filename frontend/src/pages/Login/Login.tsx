import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/Button/Button';
import { FormField } from '../../components/FormField/FormField';
import { useAuthStore } from '../../store/authStore';

const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(8, 'Пароль должен содержать минимум 8 символов'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function Login(): JSX.Element {
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const login = useAuthStore((state) => state.login);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  // Уже авторизован (например, зашли на /login напрямую) — не показываем форму
  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    setIsSubmitting(true);

    try {
      await login(values.email, values.password);
      navigate('/', { replace: true });
    } catch {
      toast.error('Неверный email или пароль');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-0 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-ink-900">
          ZhanaGasyr Education Platform
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <FormField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <FormField
            id="password"
            label="Пароль"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Вход...' : 'Войти'}
          </Button>
        </form>
      </div>
    </main>
  );
}
