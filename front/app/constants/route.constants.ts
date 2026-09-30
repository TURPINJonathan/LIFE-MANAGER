export const APP_ROUTE = {
  home: '/',
  login: '/login',
  accounts: '/comptes',
  accountLedger: '/comptes/:subAccountId',
  accountNew: '/comptes/nouveau',
  events: '/evenements',
  eventNew: '/evenements/nouveau',
  settings: '/parametres',
  settingsSection: '/parametres/:section',
} as const;

export const APP_NAME = 'Life Manager';

/** Titre d’onglet : `Partie · … · Life Manager`. Sans partie → `Life Manager`. */
export function appTitle(...parts: Array<string | null | undefined>): string {
  const cleaned = parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part));
  return cleaned.length > 0 ? `${cleaned.join(' · ')} · ${APP_NAME}` : APP_NAME;
}

export function accountLedgerPath(subAccountId: string, view?: 'operations' | 'budget'): string {
  const base = `/comptes/${subAccountId}`;
  if (!view || view === 'operations') {
    return base;
  }
  return `${base}?vue=budget`;
}

export function settingsPath(section: 'profil' | 'comptes' | 'categories' | 'enseignes' = 'profil'): string {
  return `/parametres/${section}`;
}

export function shiftYearMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
