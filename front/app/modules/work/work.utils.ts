export function formatMinutes(total: number): string {
  const safe = Math.max(0, Math.round(total));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${hours}h${String(minutes).padStart(2, '0')}`;
}

/** Numéro de semaine ISO (lundi → dimanche) pour une date `YYYY-MM-DD`. */
export function isoWeekNumber(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7; // 1=lun … 7=dim
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function bpsToPercentLabel(bps: number): string {
  return `${(bps / 100).toFixed(2).replace(/\.?0+$/, '')} %`;
}

export function percentInputToBps(value: string): number {
  const normalized = value.replace(',', '.').trim();
  const n = Number(normalized);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.round(n * 100);
}

export function bpsToPercentInput(bps: number): string {
  return (bps / 100).toFixed(2);
}

export function hoursInputToMinutes(value: string): number {
  const normalized = value.replace(',', '.').trim();
  const n = Number(normalized);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.round(n * 60);
}

export function minutesToHoursInput(minutes: number): string {
  return (minutes / 60).toFixed(2);
}

export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysIso(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export const DEFAULT_DAY_SHORTCUT = {
  label: 'Journée type',
  segments: [
    { start: '08:00', end: '12:00' },
    { start: '13:30', end: '18:00' },
  ],
  pauseMinutes: 30,
} as const;

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  cdi: 'CDI',
  cdd: 'CDD',
  interim: 'Intérim',
  apprenticeship: 'Apprentissage',
  other: 'Autre',
};
