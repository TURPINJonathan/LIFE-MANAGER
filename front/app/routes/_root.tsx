import { Outlet } from 'react-router';

import { useCheckAuth, useRouteAccent } from '@hooks';

export default function RootLayout() {
  useCheckAuth();
  useRouteAccent();
  return <Outlet />;
}
