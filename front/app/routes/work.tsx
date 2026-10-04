import { WorkPage } from '@work';
import { appTitle } from '@constants';

export function meta() {
  return [{ title: appTitle('Travail') }];
}

export default function WorkRoute() {
  return <WorkPage />;
}
