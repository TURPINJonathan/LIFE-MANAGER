import { Typography } from '@components';
import { APP_PAGE_GUTTER_CLASSES } from '@constants';
import { useAuthStore } from '@store';

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <section className={APP_PAGE_GUTTER_CLASSES}>
      <Typography variant="headline" className="text-brand dark:text-fg-primary">
        Paramètres
      </Typography>
      <dl className="mt-6 space-y-4 rounded-panel border border-border-subtle bg-elevated p-5 shadow-sm">
        <div>
          <dt className="text-control text-fg-muted">E-mail</dt>
          <dd className="text-body font-medium text-fg-primary">{user?.email}</dd>
        </div>
        <div>
          <dt className="text-control text-fg-muted">Rôles</dt>
          <dd className="text-body font-medium text-fg-primary">{user?.roles.join(', ')}</dd>
        </div>
      </dl>
    </section>
  );
}
