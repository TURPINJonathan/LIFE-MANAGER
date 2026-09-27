import { create, type StateCreator } from 'zustand';

import { THEME_STORAGE_KEY, USER_THEME } from '@constants';
import type { UserTheme } from '@app-types';

function readTheme(): UserTheme {
  if (typeof localStorage === 'undefined') return USER_THEME.light;
  return localStorage.getItem(THEME_STORAGE_KEY) === USER_THEME.dark ? USER_THEME.dark : USER_THEME.light;
}

interface IPreferencesState {
  theme: UserTheme;
  toggleTheme: () => void;
}

const preferencesCreator: StateCreator<IPreferencesState> = (set, get) => ({
  theme: readTheme(),
  toggleTheme: () => {
    const next = get().theme === USER_THEME.dark ? USER_THEME.light : USER_THEME.dark;
    localStorage.setItem(THEME_STORAGE_KEY, next);
    set({ theme: next });
  },
});

export const usePreferencesStore = create<IPreferencesState>()(preferencesCreator);
