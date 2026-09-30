import { EventsPage } from '@events';
import { appTitle } from '@constants';

export function meta() {
  return [{ title: appTitle('Événements') }];
}

export default function EventsRoute() {
  return <EventsPage />;
}
