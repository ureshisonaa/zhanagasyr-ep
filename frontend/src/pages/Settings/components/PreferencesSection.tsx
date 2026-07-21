import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import { usersApi } from '../../../services/usersApi';

const THEMES = ['Light', 'Dark'];
const LANGUAGES: { value: string; label: string }[] = [
  { value: 'ru', label: 'Русский' },
  { value: 'kz', label: 'Қазақша' },
  { value: 'en', label: 'English' },
];

export function PreferencesSection(): JSX.Element {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['user-settings'],
    queryFn: usersApi.getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: usersApi.updateSettings,
    onSuccess: () => {
      toast.success('Настройки сохранены');
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
    },
    onError: () => toast.error('Не удалось сохранить настройки'),
  });

  if (isLoading || !settings) {
    return <p className="text-sm text-ink-500">Загрузка...</p>;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium text-ink-900">Предпочтения</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="theme" className="mb-1 block text-sm font-medium text-ink-700">
            Тема
          </label>
          <select
            id="theme"
            value={settings.theme}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              updateMutation.mutate({ theme: event.target.value })
            }
            className="w-full rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
          >
            {THEMES.map((theme) => (
              <option key={theme} value={theme}>
                {theme === 'Light' ? 'Светлая' : 'Тёмная'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="language" className="mb-1 block text-sm font-medium text-ink-700">
            Язык
          </label>
          <select
            id="language"
            value={settings.language}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              updateMutation.mutate({ language: event.target.value })
            }
            className="w-full rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
          >
            {LANGUAGES.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={settings.notificationsEmail}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            updateMutation.mutate({ notificationsEmail: event.target.checked })
          }
        />
        Получать уведомления на email
      </label>
    </section>
  );
}
