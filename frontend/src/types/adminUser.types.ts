export type UserRole = 'Student' | 'Mentor' | 'Admin' | 'SuperAdmin';

export interface AdminUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}
