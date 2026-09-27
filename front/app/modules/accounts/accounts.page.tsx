import { Typography } from '@components';
import { APP_PAGE_GUTTER_CLASSES } from '@constants';

export function AccountsPage() {
  return (
    <section className={APP_PAGE_GUTTER_CLASSES}>
      <Typography variant="headline" className="text-brand dark:text-fg-primary">
        Comptes
      </Typography>
      <Typography variant="body" className="mt-3 max-w-2xl text-fg-secondary">
        Cette page accueillera les comptes bancaires, les catégories de dépenses et les pronostics. Le module API
        correspondant vivra dans <code className="text-fg-primary">api/src/Module</code>, sur le même modèle que
        Security.
      </Typography>
    </section>
  );
}
