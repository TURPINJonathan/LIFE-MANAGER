import { NAV_CONTAINER_CLASSES, NAV_ITEM_VARIANT, NAV_ITEMS } from '@constants';
import type { NavItemVariant } from '@app-types';

import { CreateMenu } from './create-menu.layout';
import { NavItem } from './nav-item.layout';

export function Nav({ variant }: { variant: NavItemVariant }) {
  const links = NAV_ITEMS.map((item) => <NavItem key={item.to} item={item} variant={variant} />);

  if (variant === NAV_ITEM_VARIANT.rail) {
    return (
      <aside className={NAV_CONTAINER_CLASSES.rail}>
        <CreateMenu variant={variant} />
        <nav aria-label="Navigation principale" className="flex flex-col gap-1">
          {links}
        </nav>
      </aside>
    );
  }

  return (
    <nav aria-label="Navigation principale" className={NAV_CONTAINER_CLASSES.tab}>
      {links.slice(0, 2)}
      <CreateMenu variant={variant} />
      {links.slice(2)}
    </nav>
  );
}
