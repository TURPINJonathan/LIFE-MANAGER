import type {
  ContributionSuggestion,
  TimeEntry,
  TimeSegmentInput,
  TimeShortcut,
  TimeStats,
  WorkDashboard,
  WorkDocument,
  WorkDocumentKind,
  WorkJob,
  WorkPlanEntry,
  Worker,
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

export async function listWorkers(token: string): Promise<Worker[]> {
  const response = await apiFetch('/api/workers', { method: 'GET' }, token);
  if (!response.ok) {
    return parseError(response, 'Impossible de charger les travailleurs.');
  }
  return readJson<Worker[]>(response);
}

export async function createWorker(
  token: string,
  body: { firstName: string; lastName?: string; notes?: string | null; position?: number },
): Promise<Worker> {
  const response = await apiFetch('/api/workers', { method: 'POST', body: JSON.stringify(body) }, token);
  if (!response.ok) {
    return parseError(response, 'Création du travailleur impossible.');
  }
  return readJson<Worker>(response);
}

export async function updateWorker(
  token: string,
  id: string,
  body: Partial<{ firstName: string; lastName: string; notes: string | null; position: number }>,
): Promise<Worker> {
  const response = await apiFetch(`/api/workers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token);
  if (!response.ok) {
    return parseError(response, 'Mise à jour du travailleur impossible.');
  }
  return readJson<Worker>(response);
}

export async function archiveWorker(token: string, id: string): Promise<Worker> {
  const response = await apiFetch(`/api/workers/${id}`, { method: 'DELETE' }, token);
  if (!response.ok) {
    return parseError(response, 'Archivage du travailleur impossible.');
  }
  return readJson<Worker>(response);
}

export async function getJob(token: string, id: string): Promise<WorkJob> {
  const response = await apiFetch(`/api/jobs/${id}`, { method: 'GET' }, token);
  if (!response.ok) {
    return parseError(response, 'Emploi introuvable.');
  }
  return readJson<WorkJob>(response);
}

export async function createJob(token: string, workerId: string, body: Record<string, unknown>): Promise<WorkJob> {
  const response = await apiFetch(
    `/api/workers/${workerId}/jobs`,
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );
  if (!response.ok) {
    return parseError(response, 'Création d’emploi impossible.');
  }
  return readJson<WorkJob>(response);
}

export async function updateJob(token: string, id: string, body: Record<string, unknown>): Promise<WorkJob> {
  const response = await apiFetch(`/api/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token);
  if (!response.ok) {
    return parseError(response, 'Mise à jour de l’emploi impossible.');
  }
  return readJson<WorkJob>(response);
}

export async function archiveJob(token: string, id: string): Promise<WorkJob> {
  const response = await apiFetch(`/api/jobs/${id}`, { method: 'DELETE' }, token);
  if (!response.ok) {
    return parseError(response, 'Archivage de l’emploi impossible.');
  }
  return readJson<WorkJob>(response);
}

export async function suggestContributionRate(token: string, jobId: string): Promise<ContributionSuggestion> {
  const response = await apiFetch(`/api/jobs/${jobId}/suggest-contribution-rate`, { method: 'POST' }, token);
  if (!response.ok) {
    return parseError(response, 'Suggestion de taux impossible.');
  }
  return readJson<ContributionSuggestion>(response);
}

export async function listTimeEntries(token: string, jobId: string, from: string, to: string): Promise<TimeEntry[]> {
  const response = await apiFetch(`/api/jobs/${jobId}/time-entries?from=${from}&to=${to}`, { method: 'GET' }, token);
  if (!response.ok) {
    return parseError(response, 'Impossible de charger les pointages.');
  }
  return readJson<TimeEntry[]>(response);
}

export async function upsertTimeEntry(
  token: string,
  jobId: string,
  body: {
    workDate: string;
    segments: TimeSegmentInput[];
    pauseMinutes?: number;
    notes?: string | null;
    workedMinutesOverride?: number | null;
  },
): Promise<TimeEntry> {
  const response = await apiFetch(
    `/api/jobs/${jobId}/time-entries`,
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );
  if (!response.ok) {
    return parseError(response, 'Enregistrement du pointage impossible.');
  }
  return readJson<TimeEntry>(response);
}

export async function deleteTimeEntry(token: string, id: string): Promise<void> {
  const response = await apiFetch(`/api/time-entries/${id}`, { method: 'DELETE' }, token);
  if (!response.ok) {
    return parseError(response, 'Suppression du pointage impossible.');
  }
}

export async function fetchTimeStats(token: string, jobId: string, from: string, to: string): Promise<TimeStats> {
  const response = await apiFetch(`/api/jobs/${jobId}/time-stats?from=${from}&to=${to}`, { method: 'GET' }, token);
  if (!response.ok) {
    return parseError(response, 'Impossible de charger les statistiques.');
  }
  return readJson<TimeStats>(response);
}

export async function listTimeShortcuts(token: string, jobId: string): Promise<TimeShortcut[]> {
  const response = await apiFetch(`/api/jobs/${jobId}/time-shortcuts`, { method: 'GET' }, token);
  if (!response.ok) {
    return parseError(response, 'Impossible de charger les raccourcis.');
  }
  return readJson<TimeShortcut[]>(response);
}

export async function createTimeShortcut(
  token: string,
  jobId: string,
  body: { label: string; segments: TimeSegmentInput[]; pauseMinutes?: number; position?: number },
): Promise<TimeShortcut> {
  const response = await apiFetch(
    `/api/jobs/${jobId}/time-shortcuts`,
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );
  if (!response.ok) {
    return parseError(response, 'Création du raccourci impossible.');
  }
  return readJson<TimeShortcut>(response);
}

export async function deleteTimeShortcut(token: string, id: string): Promise<void> {
  const response = await apiFetch(`/api/time-shortcuts/${id}`, { method: 'DELETE' }, token);
  if (!response.ok) {
    return parseError(response, 'Suppression du raccourci impossible.');
  }
}

export async function listWorkDocuments(token: string, jobId: string): Promise<WorkDocument[]> {
  const response = await apiFetch(`/api/jobs/${jobId}/documents`, { method: 'GET' }, token);
  if (!response.ok) {
    return parseError(response, 'Impossible de charger les documents.');
  }
  return readJson<WorkDocument[]>(response);
}

export async function createWorkDocument(
  token: string,
  jobId: string,
  body: { kind: WorkDocumentKind; label: string; yearMonth?: string | null },
): Promise<WorkDocument> {
  const response = await apiFetch(
    `/api/jobs/${jobId}/documents`,
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );
  if (!response.ok) {
    return parseError(response, 'Création du document impossible.');
  }
  return readJson<WorkDocument>(response);
}

export async function deleteWorkDocument(token: string, id: string): Promise<void> {
  const response = await apiFetch(`/api/work-documents/${id}`, { method: 'DELETE' }, token);
  if (!response.ok) {
    return parseError(response, 'Suppression du document impossible.');
  }
}

export async function uploadWorkDocumentFile(token: string, id: string, file: File): Promise<WorkDocument> {
  const form = new FormData();
  form.append('file', file);
  const response = await apiFetch(`/api/work-documents/${id}/file`, { method: 'POST', body: form }, token);
  if (!response.ok) {
    return parseError(response, 'Envoi du fichier impossible.');
  }
  return readJson<WorkDocument>(response);
}

export function workDocumentFileUrl(fileUrl: string): string {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:9100';
  return `${base}${fileUrl}`;
}

export async function listPlanEntries(
  token: string,
  jobId: string,
  from: string,
  to: string,
): Promise<WorkPlanEntry[]> {
  const response = await apiFetch(`/api/jobs/${jobId}/plan-entries?from=${from}&to=${to}`, { method: 'GET' }, token);
  if (!response.ok) {
    return parseError(response, 'Impossible de charger le planning.');
  }
  return readJson<WorkPlanEntry[]>(response);
}

export async function upsertPlanEntry(
  token: string,
  jobId: string,
  body: {
    workDate: string;
    segments: TimeSegmentInput[];
    pauseMinutes?: number;
    notes?: string | null;
  },
): Promise<WorkPlanEntry> {
  const response = await apiFetch(
    `/api/jobs/${jobId}/plan-entries`,
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );
  if (!response.ok) {
    return parseError(response, 'Enregistrement du planning impossible.');
  }
  return readJson<WorkPlanEntry>(response);
}

export async function deletePlanEntry(token: string, id: string): Promise<void> {
  const response = await apiFetch(`/api/plan-entries/${id}`, { method: 'DELETE' }, token);
  if (!response.ok) {
    return parseError(response, 'Suppression du planning impossible.');
  }
}

export async function fillPlanMonth(
  token: string,
  jobId: string,
  body: {
    yearMonth: string;
    shortcutId?: string | null;
    segments?: TimeSegmentInput[];
    pauseMinutes?: number;
    overwrite?: boolean;
  },
): Promise<{ created: number; updated: number; skipped: number }> {
  const response = await apiFetch(
    `/api/jobs/${jobId}/plan-entries/fill-month`,
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );
  if (!response.ok) {
    return parseError(response, 'Remplissage du mois impossible.');
  }
  return readJson(response);
}

export async function fetchWorkDashboard(token: string, yearMonth: string): Promise<WorkDashboard> {
  const response = await apiFetch(`/api/work-stats/dashboard?yearMonth=${yearMonth}`, { method: 'GET' }, token);
  if (!response.ok) {
    return parseError(response, 'Impossible de charger le tableau de bord travail.');
  }
  return readJson<WorkDashboard>(response);
}

export type TimesheetPdfKind = 'filled' | 'blank';

export async function fetchTimesheetPdf(
  token: string,
  jobId: string,
  yearMonth: string,
  kind: TimesheetPdfKind = 'filled',
): Promise<{ blob: Blob; filename: string }> {
  const path =
    kind === 'blank'
      ? `/api/jobs/${jobId}/timesheet-blank.pdf?yearMonth=${encodeURIComponent(yearMonth)}`
      : `/api/jobs/${jobId}/timesheet.pdf?yearMonth=${encodeURIComponent(yearMonth)}`;
  const response = await apiFetch(path, { method: 'GET', headers: { Accept: 'application/pdf' } }, token);
  if (!response.ok) {
    return parseError(
      response,
      kind === 'blank'
        ? 'Impossible de générer le pointage vierge.'
        : 'Impossible de générer la feuille d’heures.',
    );
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = /filename="([^"]+)"/i.exec(disposition);
  const filename =
    match?.[1] ?? (kind === 'blank' ? `pointage-vierge-${yearMonth}.pdf` : `feuille-heures-${yearMonth}.pdf`);
  return { blob, filename };
}
