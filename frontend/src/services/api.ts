import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is not defined. Check your .env file.');
}

/**
 * withCredentials: true — обязателен, так как JWT хранится в httpOnly cookie
 * (Backend, Этап 1.1), а не в заголовке Authorization.
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

/**
 * Статика (аватары и т.п.) отдаётся backend'ом вне префикса /api/v1
 * (см. main.ts, Этап 1.3) — поэтому для абсолютной ссылки на файл нужен
 * именно origin (протокол+хост+порт), а не полный API_BASE_URL с префиксом.
 */
export function getApiOrigin(): string {
  return new URL(API_BASE_URL).origin;
}

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/**
 * Колбэк вызывается, если refresh не удался (сессия окончательно истекла).
 * Регистрируется authStore — так api.ts не импортирует стор напрямую и
 * не создаёт циклическую зависимость store -> api -> store.
 */
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

/**
 * Общий in-flight promise на все параллельные 401 — если несколько запросов
 * упадут одновременно, refresh вызовется один раз, а не по разу на каждый.
 */
let refreshPromise: Promise<void> | null = null;

function isAuthEndpoint(url: string | undefined): boolean {
  return Boolean(url && (url.includes('/auth/login') || url.includes('/auth/refresh')));
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    const shouldAttemptRefresh =
      error.response?.status === 401 &&
      originalRequest !== undefined &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url);

    if (!shouldAttemptRefresh || !originalRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = api
          .post('/auth/refresh')
          .then(() => undefined)
          .finally(() => {
            refreshPromise = null;
          });
      }

      await refreshPromise;
      return await api(originalRequest);
    } catch (refreshError) {
      onUnauthorized?.();
      return Promise.reject(refreshError);
    }
  },
);
