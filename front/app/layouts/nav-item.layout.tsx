import type { RefObject } from 'react';
import { NavLink } from 'react-router';

import { Icon } from '@components';
import {
  APP_ROUTE,
  NAV_CREATE_ICON_BOX,
  NAV_ICON_BOX_ACTIVE,
  NAV_ICON_BOX_BASE,
  NAV_ICON_BOX_INACTIVE,
  NAV_ITEM_ACTIVE,
  NAV_ITEM_INACTIVE,
  NAV_ITEM_VARIANT_CLASSES,
} from '@constants';
import type { INavAction, INavItem, NavItemVariant } from '@app-types';
import { cn } from '@utils';

interface INavItemLinkProps {
  variant: NavItemVariant;
  item: INavItem;
}

interface INavItemActionProps {
  variant: NavItemVariant;
  action: INavAction;
  triggerRef?: RefObject<HTMLButtonElement | null>;
  isExpanded?: boolean;
}

type NavItemProps = INavItemLinkProps | INavItemActionProps;

export function NavItem(props: NavItemProps) {
  const classes = NAV_ITEM_VARIANT_CLASSES[props.variant];

  if ('action' in props) {
    const { action, triggerRef, isExpanded } = props;

    return (
      <button
        type="button"
        ref={triggerRef}
        onClick={action.onClick}
        {...(isExpanded === undefined ? {} : { 'aria-haspopup': 'dialog' as const, 'aria-expanded': isExpanded })}
        className={cn(classes.base, NAV_ITEM_INACTIVE)}
      >
        <span className={cn(NAV_CREATE_ICON_BOX, classes.iconBox)}>
          <Icon name={action.icon} className="text-icon" />
        </span>
        <span className="max-w-full truncate">{action.label}</span>
      </button>
    );
  }

  const { item } = props;

  return (
    <NavLink
      to={item.to}
      end={item.to === APP_ROUTE.home}
      className={({ isActive }) => cn(classes.base, isActive ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE)}
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(NAV_ICON_BOX_BASE, classes.iconBox, isActive ? NAV_ICON_BOX_ACTIVE : NAV_ICON_BOX_INACTIVE)}
          >
            <Icon name={item.icon} filled={isActive} className="text-icon" />
          </span>
          <span className="max-w-full truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
