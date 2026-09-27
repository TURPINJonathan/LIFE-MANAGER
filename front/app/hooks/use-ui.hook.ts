import { useEffect } from 'react';

import { USER_THEME } from '@constants';
import { usePreferencesStore } from '@store';
import type { UserTheme } from '@app-types';

export function useApplyTheme(): void {
  const theme = usePreferencesStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === USER_THEME.dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);
}

export function useTheme(): readonly [UserTheme, () => void] {
  const theme = usePreferencesStore((state) => state.theme);
  const toggle = usePreferencesStore((state) => state.toggleTheme);
  return [theme, toggle] as const;
}

export function useAppViewportHeight(): void {
  useEffect(() => {
    const root = document.documentElement;

    function syncAppHeight(): void {
      root.style.setProperty('--app-height', `${window.innerHeight}px`);
    }

    syncAppHeight();
    window.addEventListener('resize', syncAppHeight);
    window.visualViewport?.addEventListener('resize', syncAppHeight);
    return () => {
      window.removeEventListener('resize', syncAppHeight);
      window.visualViewport?.removeEventListener('resize', syncAppHeight);
    };
  }, []);
}
