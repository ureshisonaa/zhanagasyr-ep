import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DocumentRow } from '../../../components/DocumentRow/DocumentRow';
import { UploadCard } from '../../../components/UploadCard/UploadCard';
import { applicationDocumentsApi } from '../../../services/applicationDocumentsApi';

interface DocumentsTabProps {
  applicationId: string;
}

export function DocumentsTab({ applicationId }: DocumentsTabProps): JSX.Element {
  const queryClient = useQueryClient();

  const {
    data: applicationDocuments,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['application-documents', applicationId],
    queryFn: () => applicationDocumentsApi.getAllForApplication(applicationId),
  });

  const unlinkMutation = useMutation({
    mutationFn: (id: string) => applicationDocumentsApi.unlink(id),
    onSuccess: () => {
      toast.success('Документ отвязан от заявки');
      queryClient.invalidateQueries({ queryKey: ['application-documents', applicationId] });
    },
    onError: () => toast.error('Не удалось отвязать документ'),
  });

  return (
    <div className="space-y-4">
      <UploadCard applicationId={applicationId} />

      {isLoading && <p className="text-ink-500">Загрузка...</p>}
      {isError && <p className="text-danger">Не удалось загрузить список документов.</p>}
      {applicationDocuments && applicationDocuments.length === 0 && (
        <p className="text-ink-500">Документы пока не загружены.</p>
      )}

      {applicationDocuments && applicationDocuments.length > 0 && (
        <div className="overflow-hidden rounded border border-ink-100">
          {applicationDocuments.map((applicationDocument) => (
            <DocumentRow
              key={applicationDocument.id}
              applicationDocument={applicationDocument}
              onUnlink={(id) => unlinkMutation.mutate(id)}
              isUnlinking={unlinkMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
