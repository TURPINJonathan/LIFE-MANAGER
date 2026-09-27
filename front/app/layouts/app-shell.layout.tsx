import { NavLink, Outlet } from 'react-router';

import { Button, Dialog, Icon } from '@components';
import { APP_MAIN_SURFACE_CLASSES, BUTTON_VARIANT, MENU_ITEMS, MENU_ROW_CLASSES, NAV_ITEM_VARIANT } from '@constants';
import { useAccountMenu, useAppViewportHeight } from '@hooks';
import { useAuthStore } from '@store';

import { Nav } from './nav.layout';
import { TopBar } from './top-bar.layout';

export function AppShell() {
  const { isOpen, close } = useAccountMenu();
  const logout = useAuthStore((state) => state.logout);
  useAppViewportHeight();

  return (
    <div className="fixed inset-x-0 top-0 flex h-[var(--app-height,100dvh)] min-w-0 flex-col overflow-hidden bg-page">
      <TopBar />

      <div className="flex min-h-0 flex-1">
        <Nav variant={NAV_ITEM_VARIANT.rail} />
        <main data-app-scroll className={APP_MAIN_SURFACE_CLASSES}>
          <Outlet />
        </main>
      </div>

      <Nav variant={NAV_ITEM_VARIANT.tab} />

      <Dialog isOpen={isOpen} onClose={close} title="Menu">
        <div className="flex flex-col gap-stack-sm">
          {MENU_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={close} className={MENU_ROW_CLASSES}>
              <Icon name={item.icon} className="text-icon" />
              {item.label}
            </NavLink>
          ))}

          <Button
            variant={BUTTON_VARIANT.secondary}
            onClick={() => {
              close();
              logout();
            }}
          >
            <Icon name="logout" className="text-icon-sm" />
            Déconnexion
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
