import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { applicationsApi } from '../../services/applicationsApi';

const FETCH_LIMIT = 200;

interface StudentSummary {
  userId: string;
  studentName: string;
  applicationCount: number;
}

function pluralizeApplications(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return 'заявка';
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return 'заявки';
  }

  return 'заявок';
}

/**
 * Нет отдельного backend-эндпоинта "список студентов" — Mentor не имеет
 * доступа к /admin/users (Admin/SuperAdmin-only, Этап 11.1). Список
 * выводится группировкой уже доступного Mentor GET /applications
 * (Этап 3.1, глобальный список без userId-фильтра) на фронтенде.
 *
 * Известное упрощение: FETCH_LIMIT=200 — если заявок в системе больше,
 * список будет неполным без предупреждения об этом. Для текущего масштаба
 * платформы достаточно; при росте потребуется отдельный backend-эндпоинт
 * с собственной пагинацией по студентам, а не по заявкам.
 */
export function StudentsList(): JSX.Element {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['applications', 'all-for-students-list'],
    queryFn: () => applicationsApi.getAll({ limit: FETCH_LIMIT }),
  });

  const students: StudentSummary[] = [];

  if (data) {
    const byUserId = new Map<string, StudentSummary>();

    for (const application of data.items) {
      const existing = byUserId.get(application.userId);

      if (existing) {
        existing.applicationCount += 1;
      } else {
        byUserId.set(application.userId, {
          userId: application.userId,
          studentName: application.studentName,
          applicationCount: 1,
        });
      }
    }

    students.push(...byUserId.values());
    students.sort((a, b) => a.studentName.localeCompare(b.studentName));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Студенты</h1>

      {isLoading && <p className="text-ink-500">Загрузка...</p>}
      {isError && <p className="text-danger">Не удалось загрузить список студентов.</p>}
      {data && students.length === 0 && <p className="text-ink-500">Студентов с заявками пока нет.</p>}

      {students.length > 0 && (
        <div className="overflow-hidden rounded border border-ink-100">
          {students.map((student) => (
            <Link
              key={student.userId}
              to={`/mentor/students/${student.userId}`}
              className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3 transition-colors last:border-b-0 hover:bg-ink-50"
            >
              <span className="text-sm font-medium text-ink-900">{student.studentName}</span>
              <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-700">
                {student.applicationCount} {pluralizeApplications(student.applicationCount)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
