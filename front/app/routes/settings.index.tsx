import { Navigate } from 'react-router';

import { settingsPath } from '@constants';

export default function SettingsIndexRoute() {
  return <Navigate to={settingsPath('profil')} replace />;
}
