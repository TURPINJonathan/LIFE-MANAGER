import { AccountLedgerPage } from '@accounts';
import { appTitle } from '@constants';

export function meta() {
  return [{ title: appTitle('Compte') }];
}

export default function AccountLedgerRoute() {
  return <AccountLedgerPage />;
}
