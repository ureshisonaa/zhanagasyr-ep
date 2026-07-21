export type ApplicationStatus =
  | 'Planning'
  | 'PreparingDocuments'
  | 'WritingEssays'
  | 'SubmittingApplication'
  | 'Interview'
  | 'WaitingForDecision'
  | 'Accepted'
  | 'Rejected'
  | 'Enrolled';

export interface ApplicationResponse {
  id: string;
  userId: string;
  universityId: string;
  programId: string;
  admissionCycleId: string;
  title: string;
  applicationStatus: ApplicationStatus;
  currentStageLabel: string;
  studentName: string;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
}
