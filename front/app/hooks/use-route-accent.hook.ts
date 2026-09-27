import { useEffect } from 'react';
import { useLocation } from 'react-router';

import { resolveAccent } from '@constants';

/** Applique `data-accent` sur `<html>` selon la route courante. */
export function useRouteAccent() {
  const { pathname } = useLocation();

  useEffect(() => {
    const accent = resolveAccent(pathname);
    document.documentElement.dataset.accent = accent;
  }, [pathname]);
}
