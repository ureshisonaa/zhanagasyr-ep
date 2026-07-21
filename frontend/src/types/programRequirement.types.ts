export interface ProgramRequirementResponse {
  id: string;
  programId: string;
  documentTypeId: string | null;
  label: string;
  isRequired: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}
