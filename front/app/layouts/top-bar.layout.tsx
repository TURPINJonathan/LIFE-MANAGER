import { Link, useLocation } from 'react-router';

import { Icon, IconButton, Logo, Typography } from '@components';
import { APP_ROUTE, ICON_BUTTON_VARIANT, MENU_ITEMS, NAV_ITEMS, USER_THEME } from '@constants';
import { useTheme } from '@hooks';
import { useAuthStore, useUiStore } from '@store';
import type { INavItem } from '@app-types';

const ALL_NAV_ITEMS: readonly INavItem[] = [...NAV_ITEMS, ...MENU_ITEMS];
const PRIMARY_PATHS: readonly string[] = NAV_ITEMS.map((item) => item.to);

function resolveTitle(pathname: string, greeting: string): string {
  if (PRIMARY_PATHS.includes(pathname)) return greeting;
  const active = ALL_NAV_ITEMS.reduce<INavItem | null>((best, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`);
    return isMatch && item.to.length > (best?.to.length ?? 0) ? item : best;
  }, null);
  return active?.title ?? active?.label ?? 'Life Manager';
}

export function TopBar() {
  const { pathname } = useLocation();
  const [theme, toggleTheme] = useTheme();
  const openMenu = useUiStore((state) => state.openMenu);
  const user = useAuthStore((state) => state.user);
  const isDark = theme === USER_THEME.dark;
  const greeting = user ? `Bonjour ${user.firstName}` : 'Bonjour';
  const title = resolveTitle(pathname, greeting);
  const initials = user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() : '';

  return (
    <header className="flex h-[calc(3.25rem+env(safe-area-inset-top))] shrink-0 items-center bg-page px-2 pt-[calc(0.25rem+env(safe-area-inset-top))] md:h-21 md:pt-0 md:pr-3 md:pl-0">
      <div className="hidden shrink-0 items-center justify-center md:flex md:w-24">
        <Link to={APP_ROUTE.home} aria-label="Accueil" className="inline-flex cursor-pointer">
          <Logo variant="mark" className="h-14 w-14" />
        </Link>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-4 md:px-4 lg:px-6">
        <Typography variant="title" as="h1" className="min-w-0 truncate text-brand dark:text-fg-primary">
          {title}
        </Typography>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <IconButton
            variant={ICON_BUTTON_VARIANT.ghost}
            icon={isDark ? 'light_mode' : 'dark_mode'}
            onClick={toggleTheme}
            aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
          />
          <button
            type="button"
            onClick={openMenu}
            aria-label="Menu"
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-brand text-control font-semibold text-white dark:bg-accent"
          >
            {initials || <Icon name="person" className="text-icon-sm" />}
          </button>
        </div>
      </div>
    </header>
  );
}
