import type { DegreeLevel } from '@prisma/client';

export interface ProgramResponse {
  id: string;
  universityId: string;
  name: string;
  degreeLevel: DegreeLevel;
  description: string | null;
  duration: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
