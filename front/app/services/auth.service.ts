import type { AuthUser } from '@app-types';

import { ApiError, apiFetch, readJson } from './api-client';

type LoginResponse = {
  token: string;
};

export async function loginRequest(email: string, password: string): Promise<string> {
  const response = await apiFetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (response.status === 401) {
    throw new ApiError('Identifiants invalides.', 401);
  }

  if (!response.ok) {
    throw new ApiError('Connexion impossible.', response.status);
  }

  const payload = await readJson<LoginResponse>(response);
  if (!payload.token) {
    throw new ApiError('Réponse de connexion inattendue.', response.status);
  }

  return payload.token;
}

export async function fetchMe(token: string): Promise<AuthUser> {
  const response = await apiFetch('/api/me', { method: 'GET' }, token);
  if (response.status === 401) {
    throw new ApiError('Session expirée.', 401);
  }
  if (!response.ok) {
    throw new ApiError('Profil indisponible.', response.status);
  }

  return readJson<AuthUser>(response);
}
