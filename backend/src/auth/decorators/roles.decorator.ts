import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Ограничивает доступ к роуту списком ролей (имена из справочника Role,
 * см. prisma/seed.ts: Student/Mentor/Admin/SuperAdmin).
 * Требует совместного использования с RolesGuard.
 */
export const Roles = (...roles: string[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
