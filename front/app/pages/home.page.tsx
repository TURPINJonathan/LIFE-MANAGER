import { Typography } from '@components';
import { APP_PAGE_GUTTER_CLASSES } from '@constants';
import { useAuthStore } from '@store';

export function HomePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <section className={APP_PAGE_GUTTER_CLASSES}>
      <Typography variant="headline" className="text-brand dark:text-fg-primary">
        {user ? `Bonjour ${user.firstName}` : 'Bonjour'}
      </Typography>
      <Typography variant="body" className="mt-3 max-w-2xl text-fg-secondary">
        Life Manager rassemble ici ce qui rythme le quotidien. Les prochains modules suivront le même découpage : une
        page, un module, des appels API authentifiés.
      </Typography>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <article className="rounded-panel border border-border-subtle bg-elevated p-5 shadow-sm">
          <Typography variant="title">Comptes</Typography>
          <Typography variant="body" className="mt-2 text-fg-secondary">
            Soldes, catégories et pronostics de trésorerie.
          </Typography>
        </article>
        <article className="rounded-panel border border-border-subtle bg-elevated p-5 shadow-sm">
          <Typography variant="title">Événements</Typography>
          <Typography variant="body" className="mt-2 text-fg-secondary">
            Rendez-vous et échéances à ne pas laisser filer.
          </Typography>
        </article>
      </div>
    </section>
  );
}
