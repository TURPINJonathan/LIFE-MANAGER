import { Typography } from '@components';
import { APP_PAGE_GUTTER_CLASSES } from '@constants';

export function CategoriesPage() {
  return (
    <section className={APP_PAGE_GUTTER_CLASSES}>
      <Typography variant="headline" className="text-brand dark:text-fg-primary">
        Catégories
      </Typography>
      <Typography variant="body" className="mt-3 max-w-2xl text-fg-secondary">
        Les catégories serviront aux pronostics et au classement des mouvements. Le modèle arrive ensuite.
      </Typography>
    </section>
  );
}
