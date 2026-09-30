import { AccountsPage } from '@accounts';
import { appTitle } from '@constants';

export function meta() {
  return [{ title: appTitle('Comptes') }];
}

export default function AccountsRoute() {
  return <AccountsPage />;
}
