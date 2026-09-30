import { Outlet } from 'react-router';

import { appTitle } from '@constants';

export function meta() {
  return [{ title: appTitle('Paramètres') }];
}

export default function SettingsLayoutRoute() {
  return <Outlet />;
}
