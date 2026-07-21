import type { Application, ApplicationStatus } from '@prisma/client';
import type { ApplicationResponse } from '../interfaces/application-response.interface';

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  Planning: 'Планирование',
  PreparingDocuments: 'Подготовка документов',
  WritingEssays: 'Написание эссе',
  SubmittingApplication: 'Подача заявки',
  Interview: 'Интервью',
  WaitingForDecision: 'Ожидание решения',
  Accepted: 'Принято',
  Rejected: 'Отклонено',
  Enrolled: 'Зачислен(а)',
};

export function toApplicationResponse(
  application: Application & { user?: { firstName: string; lastName: string } },
): ApplicationResponse {
  return {
    id: application.id,
    userId: application.userId,
    universityId: application.universityId,
    programId: application.programId,
    admissionCycleId: application.admissionCycleId,
    title: application.title,
    applicationStatus: application.applicationStatus,
    currentStageLabel: APPLICATION_STATUS_LABELS[application.applicationStatus],
    studentName: application.user ? `${application.user.firstName} ${application.user.lastName}` : '',
    deadline: application.deadline,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}
