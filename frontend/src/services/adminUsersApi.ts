import { api } from './api';
import type { PaginatedResponse } from '../types/pagination.types';
import type { AdminUserResponse, UserRole } from '../types/adminUser.types';

export interface AdminUsersQuery {
  page?: number;
  limit?: number;
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export const adminUsersApi = {
  getAll: async (query: AdminUsersQuery = {}): Promise<PaginatedResponse<AdminUserResponse>> => {
    const response = await api.get<PaginatedResponse<AdminUserResponse>>('/admin/users', {
      params: query,
    });
    return response.data;
  },

  create: async (input: CreateUserInput): Promise<AdminUserResponse> => {
    const response = await api.post<{ success: true; user: AdminUserResponse }>(
      '/admin/users',
      input,
    );
    return response.data.user;
  },

  updateRole: async (id: string, role: UserRole): Promise<AdminUserResponse> => {
    const response = await api.put<{ success: true; user: AdminUserResponse }>(
      `/admin/users/${id}/role`,
      { role },
    );
    return response.data.user;
  },

  deactivate: async (id: string): Promise<AdminUserResponse> => {
    const response = await api.put<{ success: true; user: AdminUserResponse }>(
      `/admin/users/${id}/deactivate`,
    );
    return response.data.user;
  },

  activate: async (id: string): Promise<AdminUserResponse> => {
    const response = await api.put<{ success: true; user: AdminUserResponse }>(
      `/admin/users/${id}/activate`,
    );
    return response.data.user;
  },
};
