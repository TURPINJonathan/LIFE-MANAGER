import { Outlet } from 'react-router';

import { FullScreenSpinner } from '@components';
import { AUTH_STATUS } from '@constants';
import { useAuthStore } from '@store';

import { useAuthGuard } from './guard.security';

export function AuthGuard() {
  useAuthGuard();
  const status = useAuthStore((state) => state.status);

  if (status === AUTH_STATUS.error) {
    return (
      <main className="grid min-h-dvh place-items-center bg-page px-6 text-center">
        <div>
          <h1 className="text-title font-semibold">Session indisponible</h1>
          <p className="mt-2 text-body text-fg-secondary">Recharge la page ou reconnecte-toi.</p>
        </div>
      </main>
    );
  }

  if (status !== AUTH_STATUS.authenticated) {
    return <FullScreenSpinner />;
  }

  return <Outlet />;
}
