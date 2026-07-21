import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, type ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import { Avatar } from '../../../components/Avatar/Avatar';
import { Button } from '../../../components/Button/Button';
import { usersApi } from '../../../services/usersApi';
import { useAuthStore } from '../../../store/authStore';
import type { FullProfile } from '../../../types/user.types';

interface AvatarSectionProps {
  profile: FullProfile;
}

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function AvatarSection({ profile }: AvatarSectionProps): JSX.Element {
  const queryClient = useQueryClient();
  const updateUserFields = useAuthStore((state) => state.updateUserFields);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (file: File) => usersApi.updateAvatar(file),
    onSuccess: (updated) => {
      queryClient.setQueryData(['profile'], updated);
      updateUserFields({ avatar: updated.avatar });
      toast.success('Аватар обновлён');
    },
    onError: () => toast.error('Не удалось загрузить аватар'),
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    // Сброс value — иначе повторный выбор того же файла не вызовет onChange
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Допустимы только JPEG, PNG или WEBP');
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      toast.error('Максимальный размер файла — 2MB');
      return;
    }

    mutation.mutate(file);
  };

  return (
    <section className="flex items-center gap-4">
      <Avatar
        src={profile.avatar}
        name={`${profile.firstName} ${profile.lastName}`}
        size="lg"
      />
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={mutation.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          {mutation.isPending ? 'Загрузка...' : 'Изменить аватар'}
        </Button>
      </div>
    </section>
  );
}
