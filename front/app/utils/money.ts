export function formatCents(cents: number, locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** Couleur d’un montant signé : négatif = erreur, positif/zéro = succès. */
export function signedAmountClass(cents: number): string {
  return cents < 0 ? 'text-error' : 'text-success-strong';
}

/** Parse un montant saisi (ex. "-12,50" ou "12.5") vers des centimes. */
export function parseEurosToCents(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.');
  if (!cleaned || cleaned === '-' || cleaned === '+' || cleaned === '.' || cleaned === '-.') {
    return null;
  }
  const value = Number(cleaned);
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.round(value * 100);
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

/** Plafond saisie TPE : 999 999,99 €. */
export const MAX_TPE_AMOUNT_CENTS = 99_999_999;

export function formatTpeAmount(cents: number): string {
  return centsToInput(Math.max(0, Math.trunc(cents)));
}

export function appendTpeDigit(cents: number, digit: number): number {
  const safe = Math.max(0, Math.trunc(cents));
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) {
    return safe;
  }
  const next = safe * 10 + digit;
  return next > MAX_TPE_AMOUNT_CENTS ? safe : next;
}

export function backspaceTpeCents(cents: number): number {
  return Math.floor(Math.max(0, Math.trunc(cents)) / 10);
}

/** Interprète une chaîne (collage) comme buffer centimes : chiffres uniquement. */
export function centsFromDigitString(raw: string): number {
  const digits = raw.replace(/\D/g, '');
  if (!digits) {
    return 0;
  }
  const parsed = Number.parseInt(digits, 10);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.min(parsed, MAX_TPE_AMOUNT_CENTS);
}
