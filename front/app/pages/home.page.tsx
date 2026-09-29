import { Link } from 'react-router';

import { SectionCard, Typography } from '@components';
import { APP_PAGE_FILL_CLASSES, APP_PAGE_GUTTER_CLASSES, APP_ROUTE } from '@constants';
import { useAuthStore } from '@store';

export function HomePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className={`${APP_PAGE_FILL_CLASSES} overflow-y-auto`} data-app-scroll>
      <section className={APP_PAGE_GUTTER_CLASSES}>
        <Typography variant="body" className="max-w-2xl text-fg-secondary">
          {user
            ? `${user.firstName}, Life Manager centralise comptes, budgets et événements.`
            : 'Life Manager centralise comptes, budgets et événements.'}
        </Typography>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <Link to={APP_ROUTE.accounts} className="block cursor-pointer no-underline">
            <SectionCard title="Comptes" icon="account_balance_wallet" iconTint="var(--accent)">
              <p className="text-body text-fg-secondary">Soldes, opérations et budgets mensuels.</p>
            </SectionCard>
          </Link>
          <Link to={APP_ROUTE.events} className="block cursor-pointer no-underline">
            <SectionCard title="Événements" icon="event">
              <p className="text-body text-fg-secondary">Rendez-vous et échéances — bientôt.</p>
            </SectionCard>
          </Link>
        </div>
      </section>
    </div>
  );
}
