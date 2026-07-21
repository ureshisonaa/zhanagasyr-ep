import { api } from './api';
import type { AuthSuccessResponse } from '../types/auth.types';

export const authApi = {
  login: async (email: string, password: string): Promise<AuthSuccessResponse> => {
    const response = await api.post<AuthSuccessResponse>('/auth/login', { email, password });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  me: async (): Promise<AuthSuccessResponse> => {
    const response = await api.get<AuthSuccessResponse>('/auth/me');
    return response.data;
  },
};
