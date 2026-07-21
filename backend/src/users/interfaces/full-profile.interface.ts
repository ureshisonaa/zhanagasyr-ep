/**
 * Полный профиль — суперсет над Auth.SanitizedUser (там нет phone/country/
 * city/birthDate, так как это не нужно для проверки сессии). Используется
 * только страницей Settings, а не для аутентификации.
 */
export interface FullProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  country: string | null;
  city: string | null;
  birthDate: string | null;
  avatar: string | null;
  role: string;
  isActive: boolean;
}
