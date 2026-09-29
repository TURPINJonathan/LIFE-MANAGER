import { EmptyState } from '@components';
import { APP_PAGE_FILL_CLASSES, APP_PAGE_GUTTER_CLASSES } from '@constants';

export function EventsPage() {
  return (
    <div className={`${APP_PAGE_FILL_CLASSES} overflow-y-auto`} data-app-scroll>
      <div className={APP_PAGE_GUTTER_CLASSES}>
        <EmptyState
          fullHeight
          icon="event"
          title="Événements"
          message="Cette page accueillera les rendez-vous et échéances. Le modèle arrive ensuite."
        />
      </div>
    </div>
  );
}
