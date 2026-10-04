import { JobDetailPage } from '@work';
import { appTitle } from '@constants';

export function meta() {
  return [{ title: appTitle('Emploi') }];
}

export default function WorkJobRoute() {
  return <JobDetailPage />;
}
