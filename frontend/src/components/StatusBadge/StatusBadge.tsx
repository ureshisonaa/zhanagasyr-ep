interface StatusBadgeProps {
  status: string;
}

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  Uploaded: 'Загружен',
  Checking: 'Проверяется',
  Approved: 'Одобрен',
  Rejected: 'Отклонён',
  NeedsReview: 'Требует проверки',
  Expired: 'Просрочен',
};

const STATUS_STYLES: Record<string, string> = {
  Uploaded: 'bg-ink-100 text-ink-700',
  Checking: 'bg-info/10 text-info',
  Approved: 'bg-success/10 text-success',
  Rejected: 'bg-danger/10 text-danger',
  NeedsReview: 'bg-warning/10 text-warning',
  Expired: 'bg-ink-100 text-ink-500',
};

const DEFAULT_STYLE = 'bg-ink-100 text-ink-700';

export function StatusBadge({ status }: StatusBadgeProps): JSX.Element {
  const label = DOCUMENT_STATUS_LABELS[status] ?? status;
  const style = STATUS_STYLES[status] ?? DEFAULT_STYLE;

  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
