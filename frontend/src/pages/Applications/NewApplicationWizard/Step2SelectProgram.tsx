import { useQuery } from '@tanstack/react-query';
import { Button } from '../../../components/Button/Button';
import { programsApi } from '../../../services/programsApi';
import type { DegreeLevel, ProgramResponse } from '../../../types/program.types';
import type { UniversityResponse } from '../../../types/university.types';

interface Step2Props {
  university: UniversityResponse;
  selectedProgramId: string | null;
  onSelect: (program: ProgramResponse) => void;
  onNext: () => void;
  onBack: () => void;
}

const PROGRAMS_LIMIT = 50;

const DEGREE_LABELS: Record<DegreeLevel, string> = {
  Bachelor: 'Бакалавриат',
  Master: 'Магистратура',
  PhD: 'Докторантура (PhD)',
  Certificate: 'Сертификат',
};

export function Step2SelectProgram({
  university,
  selectedProgramId,
  onSelect,
  onNext,
  onBack,
}: Step2Props): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['programs', { universityId: university.id, wizard: true }],
    queryFn: () => programsApi.getAll({ universityId: university.id, limit: PROGRAMS_LIMIT }),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-ink-900">Шаг 2. Выберите программу</h2>
      <p className="text-sm text-ink-500">{university.name}</p>

      {isLoading && <p className="text-ink-500">Загрузка...</p>}
      {data && data.items.length === 0 && (
        <p className="text-ink-500">У этого университета пока нет добавленных программ.</p>
      )}

      <div className="max-h-96 space-y-2 overflow-y-auto">
        {data?.items.map((program) => {
          const isSelected = selectedProgramId === program.id;

          return (
            <button
              key={program.id}
              type="button"
              onClick={() => onSelect(program)}
              className={`w-full rounded border p-3 text-left transition-colors ${
                isSelected ? 'border-ink-900 bg-ink-50' : 'border-ink-100 hover:border-ink-400'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-ink-900">{program.name}</p>
                <span className="shrink-0 rounded-full bg-ink-100 px-2 py-1 text-xs font-medium text-ink-700">
                  {DEGREE_LABELS[program.degreeLevel]}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="secondary" onClick={onBack}>
          Назад
        </Button>
        <Button disabled={!selectedProgramId} onClick={onNext}>
          Далее
        </Button>
      </div>
    </div>
  );
}
