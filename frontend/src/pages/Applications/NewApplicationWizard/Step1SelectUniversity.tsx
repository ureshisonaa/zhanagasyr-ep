import { useQuery } from '@tanstack/react-query';
import { useState, type ChangeEvent } from 'react';
import { Button } from '../../../components/Button/Button';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { universitiesApi } from '../../../services/universitiesApi';
import type { UniversityResponse } from '../../../types/university.types';

interface Step1Props {
  selectedUniversityId: string | null;
  onSelect: (university: UniversityResponse) => void;
  onNext: () => void;
}

const WIZARD_PAGE_LIMIT = 20;

export function Step1SelectUniversity({
  selectedUniversityId,
  onSelect,
  onNext,
}: Step1Props): JSX.Element {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['universities', { search: debouncedSearch, wizard: true }],
    queryFn: () =>
      universitiesApi.getAll({ limit: WIZARD_PAGE_LIMIT, search: debouncedSearch || undefined }),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-ink-900">Шаг 1. Выберите университет</h2>

      <input
        type="text"
        placeholder="Поиск по названию..."
        value={search}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
        className="w-full rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
      />

      {isLoading && <p className="text-ink-500">Загрузка...</p>}
      {data && data.items.length === 0 && <p className="text-ink-500">Университеты не найдены.</p>}

      <div className="max-h-96 space-y-2 overflow-y-auto">
        {data?.items.map((university) => {
          const isSelected = selectedUniversityId === university.id;

          return (
            <button
              key={university.id}
              type="button"
              onClick={() => onSelect(university)}
              className={`w-full rounded border p-3 text-left transition-colors ${
                isSelected ? 'border-ink-900 bg-ink-50' : 'border-ink-100 hover:border-ink-400'
              }`}
            >
              <p className="font-medium text-ink-900">{university.name}</p>
              <p className="text-sm text-ink-500">
                {university.city}, {university.country}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <Button disabled={!selectedUniversityId} onClick={onNext}>
          Далее
        </Button>
      </div>
    </div>
  );
}
