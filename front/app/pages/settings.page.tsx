import { NavLink, Navigate, useParams } from 'react-router';

import { Icon, SectionCard } from '@components';
import {
  APP_PAGE_FILL_CLASSES,
  APP_PINNED_LIST_BODY_CLASSES,
  APP_PINNED_LIST_CHROME_CLASSES,
  settingsPath,
} from '@constants';
import { AccountsSettingsPanel } from '@accounts';
import { CategoriesSettingsPanel } from '@categories';
import { MerchantsSettingsPanel } from '@merchants';
import { useAuthStore } from '@store';
import { cn } from '@utils';

const SECTIONS = [
  { id: 'profil', label: 'Profil', icon: 'person', description: 'Identité du compte' },
  { id: 'comptes', label: 'Comptes', icon: 'account_balance', description: 'Groupes et sous-comptes' },
  { id: 'categories', label: 'Catégories', icon: 'category', description: 'Classement des opérations' },
  { id: 'enseignes', label: 'Enseignes', icon: 'storefront', description: 'Commerces et logos' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

function isSection(value: string | undefined): value is SectionId {
  return SECTIONS.some((item) => item.id === value);
}

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const { section } = useParams();

  if (!isSection(section)) {
    return <Navigate to={settingsPath('profil')} replace />;
  }

  const active = SECTIONS.find((item) => item.id === section)!;

  return (
    <div className={APP_PAGE_FILL_CLASSES}>
      <div className={APP_PINNED_LIST_CHROME_CLASSES}>
        <p className="text-control text-fg-muted">{active.description}</p>
        <nav className="mt-3 flex gap-1 overflow-x-auto md:hidden" aria-label="Sections paramètres">
          {SECTIONS.map((item) => (
            <NavLink
              key={item.id}
              to={settingsPath(item.id)}
              className={({ isActive }) =>
                cn(
                  'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-control px-3 py-2 text-control font-medium',
                  isActive ? 'bg-accent text-white' : 'bg-subtle text-fg-secondary',
                )
              }
            >
              <Icon name={item.icon} className="text-icon-sm" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className={`${APP_PINNED_LIST_BODY_CLASSES} flex min-h-0 flex-1 gap-4`} data-app-scroll>
        <aside className="hidden w-52 shrink-0 md:block">
          <nav
            className="flex flex-col gap-1 rounded-panel border border-border-subtle bg-elevated p-2"
            aria-label="Sections paramètres"
          >
            {SECTIONS.map((item) => (
              <NavLink
                key={item.id}
                to={settingsPath(item.id)}
                className={({ isActive }) =>
                  cn(
                    'flex cursor-pointer items-start gap-3 rounded-control px-3 py-2.5 transition-colors',
                    isActive
                      ? 'bg-accent-tint text-accent-press'
                      : 'text-fg-secondary hover:bg-subtle hover:text-fg-primary',
                  )
                }
              >
                <Icon name={item.icon} className="mt-0.5 text-icon-sm" />
                <span className="min-w-0">
                  <span className="block text-control font-medium">{item.label}</span>
                  <span className="block text-[11px] text-fg-muted">{item.description}</span>
                </span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          {section === 'profil' && (
            <SectionCard title="Profil" icon="person">
              <dl className="space-y-4">
                <div>
                  <dt className="text-control text-fg-muted">E-mail</dt>
                  <dd className="mt-0.5 text-body font-medium text-fg-primary">{user?.email}</dd>
                </div>
                <div>
                  <dt className="text-control text-fg-muted">Nom</dt>
                  <dd className="mt-0.5 text-body font-medium text-fg-primary">
                    {user?.firstName} {user?.lastName}
                  </dd>
                </div>
                <div>
                  <dt className="text-control text-fg-muted">Rôles</dt>
                  <dd className="mt-0.5 text-body font-medium text-fg-primary">{user?.roles.join(', ')}</dd>
                </div>
              </dl>
            </SectionCard>
          )}
          {section === 'comptes' && <AccountsSettingsPanel />}
          {section === 'categories' && <CategoriesSettingsPanel />}
          {section === 'enseignes' && <MerchantsSettingsPanel />}
        </div>
      </div>
    </div>
  );
}
