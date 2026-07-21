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

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  city?: string;
  birthDate?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
