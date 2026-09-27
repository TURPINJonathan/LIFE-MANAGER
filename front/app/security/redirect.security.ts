import { APP_ROUTE, AUTH_STATUS } from '@constants';
import type { AuthStatus } from '@app-types';

export function redirectForProtectedStatus(status: AuthStatus): string | null {
  return status === AUTH_STATUS.unauthenticated ? APP_ROUTE.login : null;
}

export function redirectForGuestStatus(status: AuthStatus): string | null {
  return status === AUTH_STATUS.authenticated ? APP_ROUTE.home : null;
}
