import { Outlet } from 'react-router';

import { FullScreenSpinner } from '@components';
import { AUTH_STATUS } from '@constants';
import { useAuthStore } from '@store';

import { useGuestGuard } from './guard.security';

export function GuestGuard() {
  useGuestGuard();
  const status = useAuthStore((state) => state.status);

  if (status === AUTH_STATUS.pending || status === AUTH_STATUS.authenticated) {
    return <FullScreenSpinner />;
  }

  return <Outlet />;
}
