import type {
  Account,
  ForecastLineInput,
  ForecastStats,
  LedgerPayload,
  LedgerTransaction,
  MonthlyForecast,
  PaymentMethod,
  SubAccount,
} from '@app-types';

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

export async function listAccounts(token: string): Promise<Account[]> {
  const response = await apiFetch('/api/accounts', { method: 'GET' }, token);
  if (!response.ok) {
    return parseError(response, 'Impossible de charger les comptes.');
  }
  return readJson<Account[]>(response);
}

export async function createAccount(
  token: string,
  body: { name: string; notes?: string | null; position?: number },
): Promise<Account> {
  const response = await apiFetch('/api/accounts', { method: 'POST', body: JSON.stringify(body) }, token);
  if (!response.ok) {
    return parseError(response, 'Création de compte impossible.');
  }
  return readJson<Account>(response);
}

export async function updateAccount(
  token: string,
  id: string,
  body: Partial<{ name: string; notes: string | null; position: number }>,
): Promise<Account> {
  const response = await apiFetch(`/api/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token);
  if (!response.ok) {
    return parseError(response, 'Mise à jour de compte impossible.');
  }
  return readJson<Account>(response);
}

export async function archiveAccount(token: string, id: string): Promise<Account> {
  const response = await apiFetch(`/api/accounts/${id}`, { method: 'DELETE' }, token);
  if (!response.ok) {
    return parseError(response, 'Suppression de compte impossible.');
  }
  return readJson<Account>(response);
}

export async function createSubAccount(
  token: string,
  accountId: string,
  body: { name: string; icon: string; color: string; openingBalanceCents?: number; position?: number },
): Promise<SubAccount> {
  const response = await apiFetch(
    `/api/accounts/${accountId}/sub-accounts`,
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );
  if (!response.ok) {
    return parseError(response, 'Création de sous-compte impossible.');
  }
  return readJson<SubAccount>(response);
}

export async function updateSubAccount(
  token: string,
  id: string,
  body: Partial<{ name: string; icon: string; color: string; openingBalanceCents: number; position: number }>,
): Promise<SubAccount> {
  const response = await apiFetch(`/api/sub-accounts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token);
  if (!response.ok) {
    return parseError(response, 'Mise à jour de sous-compte impossible.');
  }
  return readJson<SubAccount>(response);
}

export async function archiveSubAccount(token: string, id: string): Promise<SubAccount> {
  const response = await apiFetch(`/api/sub-accounts/${id}`, { method: 'DELETE' }, token);
  if (!response.ok) {
    return parseError(response, 'Suppression de sous-compte impossible.');
  }
  return readJson<SubAccount>(response);
}

export async function fetchLedger(token: string, subAccountId: string): Promise<LedgerPayload> {
  const response = await apiFetch(`/api/sub-accounts/${subAccountId}/transactions`, { method: 'GET' }, token);
  if (!response.ok) {
    return parseError(response, 'Impossible de charger le relevé.');
  }
  return readJson<LedgerPayload>(response);
}

export type TransactionInput = {
  categoryId: string;
  merchantId?: string | null;
  operationDate: string;
  effectiveDate?: string | null;
  paymentMethod: PaymentMethod;
  checkNumber?: string | null;
  designation: string;
  /** Montant absolu en centimes (> 0) ; le signe est dérivé de la catégorie. */
  amountCents: number;
  /** Requis seulement si la catégorie est `both`. */
  flow?: 'credit' | 'debit' | null;
};

export async function createTransaction(
  token: string,
  subAccountId: string,
  body: TransactionInput,
): Promise<LedgerTransaction> {
  const response = await apiFetch(
    `/api/sub-accounts/${subAccountId}/transactions`,
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );
  if (!response.ok) {
    return parseError(response, 'Création de transaction impossible.');
  }
  return readJson<LedgerTransaction>(response);
}

export async function updateTransaction(
  token: string,
  id: string,
  body: Partial<TransactionInput>,
): Promise<LedgerTransaction> {
  const response = await apiFetch(`/api/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token);
  if (!response.ok) {
    return parseError(response, 'Mise à jour de transaction impossible.');
  }
  return readJson<LedgerTransaction>(response);
}

export async function deleteTransaction(token: string, id: string): Promise<void> {
  const response = await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' }, token);
  if (!response.ok) {
    return parseError(response, 'Suppression de transaction impossible.');
  }
}

export async function uploadTransactionAttachment(token: string, id: string, file: File): Promise<LedgerTransaction> {
  const body = new FormData();
  body.append('file', file);
  const response = await apiFetch(`/api/transactions/${id}/attachment`, { method: 'POST', body }, token);
  if (!response.ok) {
    return parseError(response, 'Upload de la pièce jointe impossible.');
  }
  return readJson<LedgerTransaction>(response);
}

export async function deleteTransactionAttachment(token: string, id: string): Promise<LedgerTransaction> {
  const response = await apiFetch(`/api/transactions/${id}/attachment`, { method: 'DELETE' }, token);
  if (!response.ok) {
    return parseError(response, 'Suppression de la pièce jointe impossible.');
  }
  return readJson<LedgerTransaction>(response);
}

export async function fetchForecast(
  token: string,
  subAccountId: string,
  yearMonth: string,
): Promise<MonthlyForecast | null> {
  const response = await apiFetch(
    `/api/sub-accounts/${subAccountId}/forecasts?yearMonth=${encodeURIComponent(yearMonth)}`,
    { method: 'GET' },
    token,
  );
  if (!response.ok) {
    return parseError(response, 'Impossible de charger le budget.');
  }
  return readJson<MonthlyForecast | null>(response);
}

export async function createForecast(
  token: string,
  subAccountId: string,
  body: { yearMonth: string; lines: ForecastLineInput[] },
): Promise<MonthlyForecast> {
  const response = await apiFetch(
    `/api/sub-accounts/${subAccountId}/forecasts`,
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );
  if (!response.ok) {
    return parseError(response, 'Création du budget impossible.');
  }
  return readJson<MonthlyForecast>(response);
}

export async function duplicateForecast(
  token: string,
  subAccountId: string,
  body: { sourceYearMonth?: string; targetYearMonth?: string } = {},
): Promise<MonthlyForecast> {
  const response = await apiFetch(
    `/api/sub-accounts/${subAccountId}/forecasts/duplicate`,
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );
  if (!response.ok) {
    return parseError(response, 'Duplication du budget impossible.');
  }
  return readJson<MonthlyForecast>(response);
}

export async function updateForecast(
  token: string,
  id: string,
  body: { lines: ForecastLineInput[] },
): Promise<MonthlyForecast> {
  const response = await apiFetch(`/api/forecasts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token);
  if (!response.ok) {
    return parseError(response, 'Mise à jour du budget impossible.');
  }
  return readJson<MonthlyForecast>(response);
}

export async function deleteForecast(token: string, id: string): Promise<void> {
  const response = await apiFetch(`/api/forecasts/${id}`, { method: 'DELETE' }, token);
  if (!response.ok) {
    return parseError(response, 'Suppression du budget impossible.');
  }
}

export async function fetchForecastStats(
  token: string,
  subAccountId: string,
  yearMonth: string,
): Promise<ForecastStats> {
  const response = await apiFetch(
    `/api/sub-accounts/${subAccountId}/forecast-stats?yearMonth=${encodeURIComponent(yearMonth)}`,
    { method: 'GET' },
    token,
  );
  if (!response.ok) {
    return parseError(response, 'Impossible de charger les statistiques.');
  }
  return readJson<ForecastStats>(response);
}

export type ForecastStatsDashboard = {
  yearMonth: string;
  previousYearMonth: string;
  current: Record<string, ForecastStats>;
  previous: Record<string, ForecastStats>;
};

export async function fetchForecastStatsDashboard(
  token: string,
  yearMonth: string,
  includePrevious = true,
): Promise<ForecastStatsDashboard> {
  const params = new URLSearchParams({
    yearMonth,
    includePrevious: includePrevious ? '1' : '0',
  });
  const response = await apiFetch(`/api/forecast-stats/dashboard?${params}`, { method: 'GET' }, token);
  if (!response.ok) {
    return parseError(response, 'Impossible de charger le tableau de bord.');
  }
  return readJson<ForecastStatsDashboard>(response);
}
