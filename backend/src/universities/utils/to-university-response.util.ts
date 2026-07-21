import type { University } from '@prisma/client';
import type { UniversityResponse } from '../interfaces/university-response.interface';

/**
 * Prisma.Decimal при прямой сериализации в JSON даёт не то, что ожидает
 * клиент (внутреннее представление Decimal.js, а не число) — приводим
 * явно. Централизовано здесь, чтобы не повторять в каждом методе сервиса.
 */
export function toUniversityResponse(university: University): UniversityResponse {
  return {
    id: university.id,
    name: university.name,
    country: university.country,
    city: university.city,
    logo: university.logo,
    website: university.website,
    description: university.description,
    ranking: university.ranking,
    tuition: university.tuition ? Number(university.tuition) : null,
    currency: university.currency,
    isActive: university.isActive,
    createdAt: university.createdAt,
    updatedAt: university.updatedAt,
  };
}
