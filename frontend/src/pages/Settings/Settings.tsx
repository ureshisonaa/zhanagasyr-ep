import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../services/usersApi';
import { AvatarSection } from './components/AvatarSection';
import { PasswordSection } from './components/PasswordSection';
import { PreferencesSection } from './components/PreferencesSection';
import { ProfileSection } from './components/ProfileSection';

export function Settings(): JSX.Element {
  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({ queryKey: ['profile'], queryFn: usersApi.getProfile });

  if (isLoading) {
    return <p className="px-6 py-10 text-ink-500">Загрузка...</p>;
  }

  if (isError || !profile) {
    return <p className="px-6 py-10 text-danger">Не удалось загрузить профиль.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-6 py-10">
      <h1 className="text-2xl font-semibold text-ink-900">Настройки</h1>
      <AvatarSection profile={profile} />
      <ProfileSection profile={profile} />
      <PreferencesSection />
      <PasswordSection />
    </div>
  );
}
