import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { useAuthStore } from '@store';
import type { AuthStatus } from '@app-types';

import { redirectForGuestStatus, redirectForProtectedStatus } from './redirect.security';

function useStatusRedirect(resolve: (status: AuthStatus) => string | null): void {
  const status = useAuthStore((state) => state.status);
  const navigate = useNavigate();
  const target = resolve(status);

  useEffect(() => {
    if (target) {
      void navigate(target, { replace: true });
    }
  }, [navigate, target]);
}

export function useAuthGuard(): void {
  useStatusRedirect(redirectForProtectedStatus);
}

export function useGuestGuard(): void {
  useStatusRedirect(redirectForGuestStatus);
}
