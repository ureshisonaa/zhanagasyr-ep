import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type ChangeEvent } from 'react';
import { Button } from '../../components/Button/Button';
import { UniversityCard } from '../../components/UniversityCard/UniversityCard';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { universitiesApi } from '../../services/universitiesApi';

const PAGE_SIZE = 12;

export function Universities(): JSX.Element {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['universities', { page, search: debouncedSearch }],
    queryFn: () =>
      universitiesApi.getAll({ page, limit: PAGE_SIZE, search: debouncedSearch || undefined }),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Университеты</h1>

      <input
        type="text"
        placeholder="Поиск по названию..."
        value={search}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
        className="w-full max-w-sm rounded border border-ink-200 px-3 py-2 text-sm outline-none focus:border-ink-900"
      />

      {isLoading && <p className="text-ink-500">Загрузка...</p>}
      {isError && <p className="text-danger">Не удалось загрузить список университетов.</p>}
      {data && data.items.length === 0 && <p className="text-ink-500">Университеты не найдены.</p>}

      {data && data.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((university) => (
            <UniversityCard key={university.id} university={university} />
          ))}
        </div>
      )}

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Назад
          </Button>
          <span className="text-sm text-ink-500">
            Страница {data.meta.page} из {data.meta.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Далее
          </Button>
        </div>
      )}
    </div>
  );
}
