import { useQuery } from '@tanstack/react-query';
import { Button } from '../../../components/Button/Button';
import { admissionCyclesApi } from '../../../services/admissionCyclesApi';
import type { AdmissionCycleResponse } from '../../../types/admissionCycle.types';

interface Step3Props {
  selectedAdmissionCycleId: string | null;
  onSelect: (admissionCycle: AdmissionCycleResponse) => void;
  onNext: () => void;
  onBack: () => void;
}

const ADMISSION_CYCLES_LIMIT = 50;

export function Step3SelectAdmissionCycle({
  selectedAdmissionCycleId,
  onSelect,
  onNext,
  onBack,
}: Step3Props): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['admission-cycles', { wizard: true }],
    queryFn: () => admissionCyclesApi.getAll({ limit: ADMISSION_CYCLES_LIMIT }),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-ink-900">Шаг 3. Выберите цикл поступления</h2>

      {isLoading && <p className="text-ink-500">Загрузка...</p>}
      {data && data.items.length === 0 && (
        <p className="text-ink-500">Циклы поступления пока не добавлены.</p>
      )}

      <div className="max-h-96 space-y-2 overflow-y-auto">
        {data?.items.map((cycle) => {
          const isSelected = selectedAdmissionCycleId === cycle.id;

          return (
            <button
              key={cycle.id}
              type="button"
              onClick={() => onSelect(cycle)}
              className={`w-full rounded border p-3 text-left transition-colors ${
                isSelected ? 'border-ink-900 bg-ink-50' : 'border-ink-100 hover:border-ink-400'
              }`}
            >
              <p className="font-medium text-ink-900">{cycle.name}</p>
              <p className="text-sm text-ink-500">
                {new Date(cycle.startDate).toLocaleDateString('ru-RU')} —{' '}
                {new Date(cycle.endDate).toLocaleDateString('ru-RU')}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="secondary" onClick={onBack}>
          Назад
        </Button>
        <Button disabled={!selectedAdmissionCycleId} onClick={onNext}>
          Далее
        </Button>
      </div>
    </div>
  );
}
