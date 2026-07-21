import { create } from 'zustand';
import { authApi } from '../services/authApi';
import { setUnauthorizedHandler } from '../services/api';
import type { SanitizedUser } from '../types/auth.types';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: SanitizedUser | null;
  status: AuthStatus;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserFields: (partial: Partial<SanitizedUser>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',

  /**
   * Вызывается один раз при монтировании App — проверяет, есть ли ещё
   * действующая сессия (валидная access/refresh cookie), не заставляя
   * пользователя логиниться заново при каждом обновлении страницы.
   */
  initialize: async () => {
    if (get().status !== 'idle') {
      return;
    }

    set({ status: 'loading' });

    try {
      const { user } = await authApi.me();
      set({ user, status: 'authenticated' });
    } catch {
      set({ user: null, status: 'unauthenticated' });
    }
  },

  login: async (email, password) => {
    const { user } = await authApi.login(email, password);
    set({ user, status: 'authenticated' });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({ user: null, status: 'unauthenticated' });
    }
  },

  /**
   * Settings обновляет профиль/аватар через React Query (кэш ['profile']),
   * который authStore не видит — без этого метода Navbar показывал бы
   * устаревшее имя/аватар до следующего логина или ручного обновления
   * страницы. Вызывается из ProfileSection/AvatarSection при успехе.
   */
  updateUserFields: (partial) => {
    set((state) => (state.user ? { user: { ...state.user, ...partial } } : {}));
  },
}));

// Регистрируется один раз при загрузке модуля: если Axios-интерцептор не
// смог обновить сессию (refresh истёк), стор сбрасывается реактивно —
// ProtectedRoute сам перенаправит на /login.
setUnauthorizedHandler(() => {
  useAuthStore.setState({ user: null, status: 'unauthenticated' });
});
