import type { CreateEntry, INavItem } from '@app-types';

import { APP_ROUTE } from './route.constants';
import { CREATE_ENTRY_STATUS } from './ui.constants';

export const NAV_ITEMS = [
  { to: APP_ROUTE.home, label: 'Accueil', icon: 'dashboard' },
  { to: APP_ROUTE.accounts, label: 'Comptes', icon: 'account_balance_wallet' },
  { to: APP_ROUTE.events, label: 'Événements', icon: 'event' },
] as const satisfies readonly INavItem[];

export const CREATE_ENTRIES = [
  {
    key: 'account',
    label: 'Compte',
    icon: 'account_balance_wallet',
    status: CREATE_ENTRY_STATUS.soon,
  },
  {
    key: 'event',
    label: 'Événement',
    icon: 'event',
    status: CREATE_ENTRY_STATUS.soon,
  },
  {
    key: 'category',
    label: 'Catégorie',
    icon: 'category',
    status: CREATE_ENTRY_STATUS.soon,
  },
] as const satisfies readonly CreateEntry[];

export const MENU_ITEMS = [
  { to: APP_ROUTE.settings, label: 'Paramètres', icon: 'settings' },
] as const satisfies readonly INavItem[];
