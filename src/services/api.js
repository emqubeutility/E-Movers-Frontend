import axios from 'axios';
import { tokenStore } from './tokenStore.js';

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

let onAuthFailure = () => {};
let refreshInFlight = null;

/** Called once by the auth provider so an unrecoverable 401 can sign the user out. */
export function setAuthFailureHandler(handler) {
  onAuthFailure = handler;
}

const INTERNAL_ERROR_MESSAGE =
  'Something went wrong on our side. Please try again, or contact your administrator if it keeps happening.';

export class ApiError extends Error {
  constructor(message, status, fieldErrors = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function toApiError(error) {
  if (error instanceof ApiError) return error;
  if (error.response) {
    const body = error.response.data || {};
    // Server-side failures never show technical text to the user, whatever the server sent.
    const status = error.response.status;
    const safe = status >= 500 ? INTERNAL_ERROR_MESSAGE : body.message || 'Something went wrong';
    return new ApiError(safe, status, status >= 500 ? [] : body.errors || []);
  }
  if (error.code === 'ECONNABORTED')
    return new ApiError('The request timed out. Please try again.', 0);
  return new ApiError('Cannot reach the server. Check your connection and try again.', 0);
}

/** Concurrent 401s share one refresh call instead of each rotating the token. */
export function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = api
      .post('/auth/refresh')
      .then((response) => {
        tokenStore.set(response.data.data.accessToken);
        return response.data.data;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const isAuthCall = AUTH_PATHS.some((path) => original.url?.includes(path));
    const canRetry = error.response?.status === 401 && !isAuthCall && !original._retried;
    if (!canRetry) throw toApiError(error);

    original._retried = true;
    try {
      await refreshSession();
    } catch {
      tokenStore.clear();
      onAuthFailure();
      throw new ApiError('Your session has expired. Please sign in again.', 401);
    }
    return api(original);
  },
);

/** Unwraps the `{ success, message, data, errors }` envelope. */
export async function unwrap(promise) {
  const response = await promise;
  return response.data.data;
}
