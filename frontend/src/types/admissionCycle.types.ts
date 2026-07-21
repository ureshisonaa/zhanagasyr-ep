export type AdmissionSeason = 'Fall' | 'Spring' | 'Summer' | 'Winter';

export interface AdmissionCycleResponse {
  id: string;
  name: string;
  season: AdmissionSeason;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
