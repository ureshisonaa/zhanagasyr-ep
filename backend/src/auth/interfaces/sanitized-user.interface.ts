/**
 * Пользователь без чувствительных полей — то, что реально уходит наружу
 * в теле ответа (хеш пароля и tokenVersion сюда никогда не попадают).
 */
export interface SanitizedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  role: string;
  isActive: boolean;
}
