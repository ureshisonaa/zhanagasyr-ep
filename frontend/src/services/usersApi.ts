import { api } from './api';
import type { ChangePasswordInput, FullProfile, UpdateProfileInput } from '../types/user.types';
import type { UserSettingsResponse } from '../types/userSettings.types';

interface ProfileResponse {
  success: true;
  profile: FullProfile;
}

interface SettingsResponse {
  success: true;
  settings: UserSettingsResponse;
}

export const usersApi = {
  getProfile: async (): Promise<FullProfile> => {
    const response = await api.get<ProfileResponse>('/users/profile');
    return response.data.profile;
  },

  updateProfile: async (input: UpdateProfileInput): Promise<FullProfile> => {
    const response = await api.put<ProfileResponse>('/users/profile', input);
    return response.data.profile;
  },

  /**
   * Content-Type НЕ выставляется вручную: для тела-FormData axios сам
   * ставит "multipart/form-data; boundary=...". Ручной заголовок без
   * boundary сломал бы парсинг файла на backend.
   */
  updateAvatar: async (file: File): Promise<FullProfile> => {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await api.put<ProfileResponse>('/users/avatar', formData);
    return response.data.profile;
  },

  changePassword: async (input: ChangePasswordInput): Promise<void> => {
    await api.put('/users/password', input);
  },

  getSettings: async (): Promise<UserSettingsResponse> => {
    const response = await api.get<SettingsResponse>('/users/settings');
    return response.data.settings;
  },

  updateSettings: async (input: Partial<UserSettingsResponse>): Promise<UserSettingsResponse> => {
    const response = await api.put<SettingsResponse>('/users/settings', input);
    return response.data.settings;
  },
};
