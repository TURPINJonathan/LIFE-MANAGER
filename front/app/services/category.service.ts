import type { Category, CategoryKind } from '@app-types';

import { ApiError, apiFetch, readJson } from './api-client';

async function parseError(response: Response, fallback: string): Promise<never> {
  try {
    const payload = await readJson<{ message?: string }>(response);
    throw new ApiError(payload.message ?? fallback, response.status);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(fallback, response.status);
  }
}

export async function listCategories(token: string): Promise<Category[]> {
  const response = await apiFetch('/api/categories', { method: 'GET' }, token);
  if (!response.ok) {
    return parseError(response, 'Impossible de charger les catégories.');
  }
  return readJson<Category[]>(response);
}

export async function createCategory(
  token: string,
  body: {
    name: string;
    icon: string;
    color: string;
    kind: CategoryKind;
    position?: number;
    merchantIds?: string[];
    favoriteMerchantId?: string | null;
  },
): Promise<Category> {
  const response = await apiFetch('/api/categories', { method: 'POST', body: JSON.stringify(body) }, token);
  if (!response.ok) {
    return parseError(response, 'Création de catégorie impossible.');
  }
  return readJson<Category>(response);
}

export async function updateCategory(
  token: string,
  id: string,
  body: Partial<{
    name: string;
    icon: string;
    color: string;
    kind: CategoryKind;
    position: number;
    merchantIds: string[];
    favoriteMerchantId: string | null;
  }>,
): Promise<Category> {
  const response = await apiFetch(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token);
  if (!response.ok) {
    return parseError(response, 'Mise à jour de catégorie impossible.');
  }
  return readJson<Category>(response);
}

export async function archiveCategory(token: string, id: string): Promise<Category> {
  const response = await apiFetch(`/api/categories/${id}`, { method: 'DELETE' }, token);
  if (!response.ok) {
    return parseError(response, 'Suppression de catégorie impossible.');
  }
  return readJson<Category>(response);
}
