import { LoginPage } from '@pages';
import { appTitle } from '@constants';

export function meta() {
  return [{ title: appTitle('Connexion') }];
}

export default function LoginRoute() {
  return <LoginPage />;
}
