import { FiExternalLink, FiFile, FiX } from 'react-icons/fi';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import type { ApplicationDocumentResponse } from '../../types/applicationDocument.types';

interface DocumentRowProps {
  applicationDocument: ApplicationDocumentResponse;
  onUnlink: (id: string) => void;
  isUnlinking: boolean;
}

export function DocumentRow({
  applicationDocument,
  onUnlink,
  isUnlinking,
}: DocumentRowProps): JSX.Element {
  const { document, isShared } = applicationDocument;

  return (
    <div className="border-b border-ink-100 px-3 py-2 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <FiFile className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
          <span className="truncate text-sm font-medium text-ink-900">{document.fileName}</span>
          {isShared && (
            <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-700">
              Общий
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <StatusBadge status={document.status} />

          {document.driveUrl && (
            <a
              href={document.driveUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-info hover:underline"
            >
              <FiExternalLink className="h-3 w-3" aria-hidden />
              Открыть
            </a>
          )}

          <button
            type="button"
            onClick={() => onUnlink(applicationDocument.id)}
            disabled={isUnlinking}
            className="text-ink-400 transition-colors hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Отвязать документ от заявки"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Объяснение AI-проверки — почему документ одобрен/отклонён/требует
          проверки. Показывается только когда есть что показывать (после
          Checking/Uploaded объяснения ещё нет). */}
      {document.verificationResult && (
        <p className="mt-1 pl-6 text-xs text-ink-500">{document.verificationResult}</p>
      )}
    </div>
  );
}
