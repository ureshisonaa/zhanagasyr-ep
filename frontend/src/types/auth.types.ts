export interface SanitizedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  role: string;
  isActive: boolean;
}

export interface AuthSuccessResponse {
  success: true;
  user: SanitizedUser;
}
