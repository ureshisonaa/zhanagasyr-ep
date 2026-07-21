import type { DegreeLevel, ProgramResponse } from '../../types/program.types';

interface ProgramCardProps {
  program: ProgramResponse;
}

const DEGREE_LABELS: Record<DegreeLevel, string> = {
  Bachelor: 'Бакалавриат',
  Master: 'Магистратура',
  PhD: 'Докторантура (PhD)',
  Certificate: 'Сертификат',
};

export function ProgramCard({ program }: ProgramCardProps): JSX.Element {
  return (
    <div className="rounded border border-ink-100 p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-medium text-ink-900">{program.name}</h4>
        <span className="shrink-0 rounded-full bg-ink-100 px-2 py-1 text-xs font-medium text-ink-700">
          {DEGREE_LABELS[program.degreeLevel]}
        </span>
      </div>
      {program.duration && <p className="mt-1 text-sm text-ink-500">Длительность: {program.duration}</p>}
      {program.description && <p className="mt-2 text-sm text-ink-700">{program.description}</p>}
    </div>
  );
}
