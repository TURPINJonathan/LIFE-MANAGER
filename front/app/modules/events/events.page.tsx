import { Typography } from '@components';
import { APP_PAGE_GUTTER_CLASSES } from '@constants';

export function EventsPage() {
  return (
    <section className={APP_PAGE_GUTTER_CLASSES}>
      <Typography variant="headline" className="text-brand dark:text-fg-primary">
        Événements
      </Typography>
      <Typography variant="body" className="mt-3 max-w-2xl text-fg-secondary">
        Cette page accueillera les événements du quotidien. Elle reste vide le temps de définir le modèle : date,
        rappel, et lien éventuel avec un compte ou une catégorie.
      </Typography>
    </section>
  );
}
