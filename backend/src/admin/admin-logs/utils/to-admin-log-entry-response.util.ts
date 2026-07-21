import type { AdminLogEntry, User } from '@prisma/client';
import type { AdminLogEntryResponse } from '../interfaces/admin-log-entry-response.interface';

type AdminLogEntryWithAdmin = AdminLogEntry & {
  admin?: Pick<User, 'firstName' | 'lastName'>;
};

export function toAdminLogEntryResponse(entry: AdminLogEntryWithAdmin): AdminLogEntryResponse {
  const admin = entry.admin!;

  return {
    id: entry.id,
    adminId: entry.adminId,
    adminName: `${admin.firstName} ${admin.lastName}`,
    method: entry.method,
    path: entry.path,
    statusCode: entry.statusCode,
    createdAt: entry.createdAt,
  };
}
