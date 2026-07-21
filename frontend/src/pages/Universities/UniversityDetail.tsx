import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ProgramCard } from '../../components/ProgramCard/ProgramCard';
import { programsApi } from '../../services/programsApi';
import { universitiesApi } from '../../services/universitiesApi';

const PROGRAMS_PAGE_LIMIT = 50;

export function UniversityDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();

  const {
    data: university,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['universities', id],
    queryFn: () => universitiesApi.getOne(id ?? ''),
    enabled: Boolean(id),
  });

  const { data: programsData, isLoading: isProgramsLoading } = useQuery({
    queryKey: ['programs', { universityId: id }],
    queryFn: () => programsApi.getAll({ universityId: id, limit: PROGRAMS_PAGE_LIMIT }),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <p className="px-6 py-10 text-ink-500">Загрузка...</p>;
  }

  if (isError || !university) {
    return <p className="px-6 py-10 text-danger">Университет не найден.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <Link to="/universities" className="text-sm text-ink-500 hover:text-ink-900">
        ← Назад к списку
      </Link>

      <div className="flex items-start gap-4">
        {university.logo && (
          <img
            src={university.logo}
            alt={university.name}
            className="h-16 w-16 shrink-0 rounded object-cover"
          />
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{university.name}</h1>
          <p className="text-ink-500">
            {university.city}, {university.country}
          </p>
        </div>
      </div>

      {university.description && <p className="text-ink-700">{university.description}</p>}

      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        {university.ranking !== null && (
          <div>
            <dt className="text-ink-500">Рейтинг</dt>
            <dd className="font-medium text-ink-900">#{university.ranking}</dd>
          </div>
        )}
        {university.tuition !== null && (
          <div>
            <dt className="text-ink-500">Стоимость обучения</dt>
            <dd className="font-medium text-ink-900">
              {university.tuition} {university.currency}
            </dd>
          </div>
        )}
        {university.website && (
          <div>
            <dt className="text-ink-500">Сайт</dt>
            <dd>
              <a
                href={university.website}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-info underline"
              >
                {university.website}
              </a>
            </dd>
          </div>
        )}
      </dl>

      <section>
        <h2 className="mb-4 text-lg font-medium text-ink-900">Программы</h2>

        {isProgramsLoading && <p className="text-ink-500">Загрузка программ...</p>}

        {programsData && programsData.items.length === 0 && (
          <p className="text-ink-500">Программы пока не добавлены.</p>
        )}

        {programsData && programsData.items.length > 0 && (
          <div className="space-y-3">
            {programsData.items.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
