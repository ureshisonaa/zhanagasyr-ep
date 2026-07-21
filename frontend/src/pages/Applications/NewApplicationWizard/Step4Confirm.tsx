import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { Button } from '../../../components/Button/Button';
import { applicationsApi } from '../../../services/applicationsApi';
import type { AdmissionCycleResponse } from '../../../types/admissionCycle.types';
import type { ApplicationResponse } from '../../../types/application.types';
import type { ProgramResponse } from '../../../types/program.types';
import type { UniversityResponse } from '../../../types/university.types';

interface Step4Props {
  university: UniversityResponse;
  program: ProgramResponse;
  admissionCycle: AdmissionCycleResponse;
  onBack: () => void;
  onCreated: (application: ApplicationResponse) => void;
}

const DUPLICATE_STATUS_CODE = 409;

export function Step4Confirm({
  university,
  program,
  admissionCycle,
  onBack,
  onCreated,
}: Step4Props): JSX.Element {
  const mutation = useMutation({
    mutationFn: () =>
      applicationsApi.create({
        universityId: university.id,
        programId: program.id,
        admissionCycleId: admissionCycle.id,
      }),
    onSuccess: (application) => {
      toast.success('Заявка создана');
      onCreated(application);
    },
    onError: (error: AxiosError) => {
      if (error.response?.status === DUPLICATE_STATUS_CODE) {
        toast.error('У вас уже есть заявка с таким сочетанием университета, программы и цикла поступления');
        return;
      }
      toast.error('Не удалось создать заявку');
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-ink-900">Шаг 4. Подтверждение</h2>

      <dl className="space-y-3 rounded border border-ink-100 p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-500">Университет</dt>
          <dd className="font-medium text-ink-900">{university.name}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-500">Программа</dt>
          <dd className="font-medium text-ink-900">{program.name}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-500">Цикл поступления</dt>
          <dd className="font-medium text-ink-900">{admissionCycle.name}</dd>
        </div>
      </dl>

      <div className="flex justify-between pt-4">
        <Button variant="secondary" onClick={onBack} disabled={mutation.isPending}>
          Назад
        </Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? 'Создание...' : 'Создать заявку'}
        </Button>
      </div>
    </div>
  );
}
