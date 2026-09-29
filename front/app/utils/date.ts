/** Formate une date ISO `YYYY-MM-DD` en français `JJ/MM/AAAA` (optionnellement avec le jour). */
export function formatIsoDateFr(
  isoDate: string,
  options?: {
    locale?: string;
    /** Ex. `short` → « lun. 28/09/2026 » */
    weekday?: 'short' | 'narrow' | 'long';
  },
): string {
  const locale = options?.locale ?? 'fr-FR';
  const date = parseIsoDateLocal(isoDate);
  if (!date) return isoDate;

  const formatOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };
  if (options?.weekday) {
    formatOptions.weekday = options.weekday;
  }

  return new Intl.DateTimeFormat(locale, formatOptions).format(date);
}

/** Parse `YYYY-MM-DD` en Date locale (évite les décalages UTC). */
export function parseIsoDateLocal(isoDate: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Formate une Date locale en `YYYY-MM-DD`. */
export function toIsoDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Date du jour en `YYYY-MM-DD` (fuseau local). */
export function todayIsoLocal(): string {
  return toIsoDateLocal(new Date());
}
