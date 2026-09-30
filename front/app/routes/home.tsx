import { HomePage } from '@pages';
import { appTitle } from '@constants';

export function meta() {
  return [{ title: appTitle('Accueil') }];
}

export default function HomeRoute() {
  return <HomePage />;
}
