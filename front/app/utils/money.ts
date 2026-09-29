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
