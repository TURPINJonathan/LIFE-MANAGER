import { Dialog, Popover } from '@components';
import { CREATE_ENTRIES, CREATE_MENU_TITLE, NAV_ITEM_VARIANT, POPOVER_PLACEMENT } from '@constants';
import { useCreateMenu } from '@hooks';
import type { INavAction, NavItemVariant } from '@app-types';

import { CreateMenuItem } from './create-menu-item.layout';
import { NavItem } from './nav-item.layout';

export function CreateMenu({ variant }: { variant: NavItemVariant }) {
  const { isOpen, open, close, triggerRef } = useCreateMenu(variant);
  const action: INavAction = { icon: 'add', label: CREATE_MENU_TITLE, onClick: open };
  const items = CREATE_ENTRIES.map((entry) => <CreateMenuItem key={entry.key} entry={entry} onSelect={close} />);

  return (
    <>
      <NavItem variant={variant} action={action} triggerRef={triggerRef} isExpanded={isOpen} />
      {variant === NAV_ITEM_VARIANT.rail ? (
        <Popover
          isOpen={isOpen}
          onClose={close}
          anchorRef={triggerRef}
          placement={POPOVER_PLACEMENT.rightStart}
          label={CREATE_MENU_TITLE}
        >
          {items}
        </Popover>
      ) : (
        <Dialog isOpen={isOpen} onClose={close} title={CREATE_MENU_TITLE}>
          <div className="flex flex-col">{items}</div>
        </Dialog>
      )}
    </>
  );
}
