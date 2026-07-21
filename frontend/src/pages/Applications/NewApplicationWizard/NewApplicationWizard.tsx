import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AdmissionCycleResponse } from '../../../types/admissionCycle.types';
import type { ApplicationResponse } from '../../../types/application.types';
import type { ProgramResponse } from '../../../types/program.types';
import type { UniversityResponse } from '../../../types/university.types';
import { Step1SelectUniversity } from './Step1SelectUniversity';
import { Step2SelectProgram } from './Step2SelectProgram';
import { Step3SelectAdmissionCycle } from './Step3SelectAdmissionCycle';
import { Step4Confirm } from './Step4Confirm';

type WizardStep = 1 | 2 | 3 | 4;

const TOTAL_STEPS = 4;

export function NewApplicationWizard(): JSX.Element {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>(1);
  const [university, setUniversity] = useState<UniversityResponse | null>(null);
  const [program, setProgram] = useState<ProgramResponse | null>(null);
  const [admissionCycle, setAdmissionCycle] = useState<AdmissionCycleResponse | null>(null);

  const goNext = (): void => setStep((current) => (current < TOTAL_STEPS ? ((current + 1) as WizardStep) : current));
  const goBack = (): void => setStep((current) => (current > 1 ? ((current - 1) as WizardStep) : current));

  // Смена университета обнуляет уже выбранную программу — она могла
  // принадлежать другому вузу и больше не валидна для нового выбора.
  const handleSelectUniversity = (selected: UniversityResponse): void => {
    setUniversity(selected);
    setProgram(null);
  };

  const handleCreated = (_application: ApplicationResponse): void => {
    // Application Workspace появится в Этапе 3.4 — вести пока некуда,
    // возвращаем на Dashboard, где созданная заявка уже видна в списке.
    navigate('/', { replace: true });
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Новая заявка</h1>
        <p className="mt-1 text-sm text-ink-500">
          Шаг {step} из {TOTAL_STEPS}
        </p>
      </div>

      {step === 1 && (
        <Step1SelectUniversity
          selectedUniversityId={university?.id ?? null}
          onSelect={handleSelectUniversity}
          onNext={goNext}
        />
      )}

      {step === 2 && university && (
        <Step2SelectProgram
          university={university}
          selectedProgramId={program?.id ?? null}
          onSelect={setProgram}
          onNext={goNext}
          onBack={goBack}
        />
      )}

      {step === 3 && (
        <Step3SelectAdmissionCycle
          selectedAdmissionCycleId={admissionCycle?.id ?? null}
          onSelect={setAdmissionCycle}
          onNext={goNext}
          onBack={goBack}
        />
      )}

      {step === 4 && university && program && admissionCycle && (
        <Step4Confirm
          university={university}
          program={program}
          admissionCycle={admissionCycle}
          onBack={goBack}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
