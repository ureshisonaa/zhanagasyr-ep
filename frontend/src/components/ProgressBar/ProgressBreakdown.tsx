import type { ProgressResponse } from '../../types/progress.types';
import { ProgressBar } from './ProgressBar';

interface ProgressBreakdownProps {
  progress: ProgressResponse;
  /** Компактный режим (только общий прогресс, без разбивки) — для карточек списка, Dashboard. */
  showCategories?: boolean;
}

const CATEGORY_FIELDS: { key: keyof Omit<ProgressResponse, 'total'>; label: string }[] = [
  { key: 'documents', label: 'Документы' },
  { key: 'essays', label: 'Эссе' },
  { key: 'checklist', label: 'Чек-лист' },
  { key: 'deadlines', label: 'Дедлайны' },
  { key: 'interview', label: 'Интервью' },
];

export function ProgressBreakdown({
  progress,
  showCategories = true,
}: ProgressBreakdownProps): JSX.Element {
  return (
    <div>
      <ProgressBar value={progress.total} label="Общий прогресс" />

      {showCategories && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
          {CATEGORY_FIELDS.map(({ key, label }) => (
            <ProgressBar key={key} value={progress[key]} label={label} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}
