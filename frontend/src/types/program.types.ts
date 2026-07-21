export type DegreeLevel = 'Bachelor' | 'Master' | 'PhD' | 'Certificate';

export interface ProgramResponse {
  id: string;
  universityId: string;
  name: string;
  degreeLevel: DegreeLevel;
  description: string | null;
  duration: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
