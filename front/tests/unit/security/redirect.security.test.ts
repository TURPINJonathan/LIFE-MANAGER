import { describe, expect, it } from 'vitest';

import { AUTH_STATUS } from '@constants';
import { redirectForGuestStatus, redirectForProtectedStatus } from '~/security/redirect.security';

describe('redirections de session', () => {
  it('envoie un visiteur non connecté vers la connexion', () => {
    expect(redirectForProtectedStatus(AUTH_STATUS.unauthenticated)).toBe('/login');
    expect(redirectForProtectedStatus(AUTH_STATUS.authenticated)).toBeNull();
  });

  it('renvoie un visiteur déjà connecté vers l’accueil', () => {
    expect(redirectForGuestStatus(AUTH_STATUS.authenticated)).toBe('/');
    expect(redirectForGuestStatus(AUTH_STATUS.unauthenticated)).toBeNull();
  });
});
