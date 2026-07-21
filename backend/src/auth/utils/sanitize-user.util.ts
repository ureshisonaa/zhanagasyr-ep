import type { SanitizedUser } from '../interfaces/sanitized-user.interface';
import type { UserWithRole } from '../../common/interfaces/user-with-role.interface';

export function toSanitizedUser(user: UserWithRole): SanitizedUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    role: user.role.name,
    isActive: user.isActive,
  };
}
