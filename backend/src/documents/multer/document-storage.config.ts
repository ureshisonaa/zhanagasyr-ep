import { buildMulterDiskStorageOptions } from '../../common/utils/multer-disk-storage.util';

/**
 * ВРЕМЕННОЕ хранилище (Этап 4.1) — файл лежит здесь до переноса в Google
 * Drive (Этап 4.2), после чего удаляется. Пайплайн из ТЗ (Часть 3, п.13):
 * NestJS -> проверка MIME -> проверка размера -> (антивирус, опционально)
 * -> Google Drive -> запись ссылки в PostgreSQL -> удаление временного
 * файла. Этот этап реализует только первые два шага.
 *
 * То же предупреждение о персистентности диска на Railway, что и для
 * аватаров (Этап 1.3) — здесь оно даже более критично, так как документы
 * (паспорт, IELTS) обязаны попасть в Google Drive, а не остаться только
 * тут навсегда.
 */
export const DOCUMENT_TEMP_UPLOAD_DIR = './uploads/documents-temp';

const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// 10MB — сканы многостраничных документов (транскрипты, финансовые
// выписки) существенно тяжелее аватарки (2MB, Этап 1.3).
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

export const documentMulterOptions = buildMulterDiskStorageOptions({
  uploadDir: DOCUMENT_TEMP_UPLOAD_DIR,
  allowedMimeTypes: ALLOWED_DOCUMENT_MIME_TYPES,
  maxSizeBytes: MAX_DOCUMENT_SIZE_BYTES,
  unsupportedTypeMessage: 'Unsupported file type. Allowed: PDF, JPEG, PNG, WEBP, DOC, DOCX',
});
