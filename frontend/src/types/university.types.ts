export interface UniversityResponse {
  id: string;
  name: string;
  country: string;
  city: string;
  logo: string | null;
  website: string | null;
  description: string | null;
  ranking: number | null;
  tuition: number | null;
  currency: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
