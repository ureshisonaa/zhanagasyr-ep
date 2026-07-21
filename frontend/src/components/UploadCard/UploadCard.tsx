import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../Button/Button';
import { applicationDocumentsApi } from '../../services/applicationDocumentsApi';
import { documentTypesApi } from '../../services/documentTypesApi';
import { documentsApi } from '../../services/documentsApi';

interface UploadCardProps {
  applicationId: string;
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Соответствует лимиту backend (documents/multer/document-storage.config.ts, Этап 4.1) —
// проверка здесь даёт мгновенную обратную связь, не дожидаясь ответа сервера.
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function UploadCard({ applicationId }: UploadCardProps): JSX.Element {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentTypeId, setDocumentTypeId] = useState('');

  const { data: documentTypes } = useQuery({
    queryKey: ['document-types'],
    queryFn: () => documentTypesApi.getAll(),
  });

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const document = await documentsApi.upload(documentTypeId, file);
      return applicationDocumentsApi.link({ applicationId, documentId: document.id });
    },
    onSuccess: () => {
      toast.success('Документ загружен');
      queryClient.invalidateQueries({ queryKey: ['application-documents', applicationId] });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: () => toast.error('Не удалось загрузить документ'),
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error('Недопустимый тип файла. Разрешены: PDF, JPEG, PNG, WEBP, DOC, DOCX');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error('Файл слишком большой (максимум 10MB)');
      return;
    }

    mutation.mutate(file);
  };

  return (
    <div className="rounded border border-ink-100 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={documentTypeId}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => setDocumentTypeId(event.target.value)}
          className="rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
        >
          <option value="">Выберите вид документа...</option>
          {documentTypes?.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>

        <Button
          type="button"
          variant="secondary"
          disabled={!documentTypeId || mutation.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          {mutation.isPending ? 'Загрузка...' : 'Выбрать файл'}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          onChange={handleFileChange}
        />
      </div>
      <p className="mt-2 text-xs text-ink-500">PDF, JPEG, PNG, WEBP, DOC, DOCX — до 10MB</p>
    </div>
  );
}
