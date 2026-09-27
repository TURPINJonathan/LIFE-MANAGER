export const AUTH_STATUS = {
  pending: 'pending',
  authenticated: 'authenticated',
  unauthenticated: 'unauthenticated',
  error: 'error',
} as const;

export const TOKEN_STORAGE_KEY = 'lm.accessToken';
