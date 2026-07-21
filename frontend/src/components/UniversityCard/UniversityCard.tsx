import { Link } from 'react-router-dom';
import type { UniversityResponse } from '../../types/university.types';

interface UniversityCardProps {
  university: UniversityResponse;
}

export function UniversityCard({ university }: UniversityCardProps): JSX.Element {
  return (
    <Link
      to={`/universities/${university.id}`}
      className="block rounded border border-ink-100 p-4 transition-colors hover:border-ink-400"
    >
      <div className="flex items-start gap-3">
        {university.logo ? (
          <img
            src={university.logo}
            alt={university.name}
            className="h-12 w-12 shrink-0 rounded object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-ink-100 text-sm font-medium text-ink-700">
            {university.name.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-ink-900">{university.name}</h3>
          <p className="text-sm text-ink-500">
            {university.city}, {university.country}
          </p>
        </div>

        {university.ranking !== null && (
          <span className="shrink-0 rounded-full bg-ink-100 px-2 py-1 text-xs font-medium text-ink-700">
            #{university.ranking}
          </span>
        )}
      </div>
    </Link>
  );
}
