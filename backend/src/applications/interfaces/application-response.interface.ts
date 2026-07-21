import type { ApplicationStatus } from '@prisma/client';

export interface ApplicationResponse {
  id: string;
  userId: string;
  universityId: string;
  programId: string;
  admissionCycleId: string;
  title: string;
  applicationStatus: ApplicationStatus;
  /** Человекочитаемая метка — вычисляется из applicationStatus, не хранится. */
  currentStageLabel: string;
  /** '' если данные автора не были подгружены (например, сразу после create()). */
  studentName: string;
  deadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
