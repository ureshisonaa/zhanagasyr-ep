import type { AdmissionSeason } from '@prisma/client';

export interface AdmissionCycleResponse {
  id: string;
  name: string;
  season: AdmissionSeason;
  year: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
