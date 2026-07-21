import { Link } from 'react-router-dom';
import type { ApplicationResponse } from '../../types/application.types';
import type { ProgressResponse } from '../../types/progress.types';
import { ProgressBar } from '../ProgressBar/ProgressBar';

interface ApplicationCardProps {
  application: ApplicationResponse;
  /** Необязателен — карточка используется и там, где прогресс ещё не загружен/не нужен. */
  progress?: ProgressResponse;
}

export function ApplicationCard({ application, progress }: ApplicationCardProps): JSX.Element {
  return (
    <Link
      to={`/applications/${application.id}`}
      className="block rounded border border-ink-100 p-4 transition-colors hover:border-ink-400"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium text-ink-900">{application.title}</h3>
        <span className="shrink-0 rounded-full bg-ink-100 px-2 py-1 text-xs font-medium text-ink-700">
          {application.currentStageLabel}
        </span>
      </div>

      {progress && (
        <div className="mt-3">
          <ProgressBar value={progress.total} size="sm" />
        </div>
      )}
    </Link>
  );
}
