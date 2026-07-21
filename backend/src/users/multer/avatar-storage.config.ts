import { buildMulterDiskStorageOptions } from '../../common/utils/multer-disk-storage.util';

export const AVATAR_UPLOAD_DIR = './uploads/avatars';
export const AVATAR_PUBLIC_PATH_PREFIX = '/uploads/avatars';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

/**
 * ВНИМАНИЕ (ограничение этого этапа): файлы хранятся на локальном диске
 * контейнера. На Railway диск НЕ гарантированно персистентен между
 * редеплоями без подключения отдельного volume — при переезде на Railway
 * это нужно либо настроить persistent volume, либо перенести аватары на
 * облачное хранилище. Для профильной картинки (в отличие от документов
 * заявок, которые обязаны быть в Google Drive — Фаза 4) такое упрощение
 * приемлемо на MVP-этапе, но не для боевого продакшена без volume.
 */
export const avatarMulterOptions = buildMulterDiskStorageOptions({
  uploadDir: AVATAR_UPLOAD_DIR,
  allowedMimeTypes: ALLOWED_MIME_TYPES,
  maxSizeBytes: MAX_AVATAR_SIZE_BYTES,
  unsupportedTypeMessage: 'Only JPEG, PNG or WEBP images are allowed',
});
