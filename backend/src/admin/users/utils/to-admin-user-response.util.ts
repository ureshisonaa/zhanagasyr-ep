import type { Role, User } from '@prisma/client';
import type { AdminUserResponse } from '../interfaces/admin-user-response.interface';

export function toAdminUserResponse(user: User & { role: Role }): AdminUserResponse {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.name,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}
