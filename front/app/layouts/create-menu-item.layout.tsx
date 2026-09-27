import { Link } from 'react-router';

import { Icon } from '@components';
import {
  CREATE_ENTRY_STATUS,
  CREATE_MENU_BADGE_CLASSES,
  CREATE_MENU_ROW_CLASSES,
  CREATE_MENU_ROW_STATE_CLASSES,
  CREATE_SOON_BADGE_LABEL,
} from '@constants';
import type { CreateEntry } from '@app-types';
import { cn } from '@utils';

export function CreateMenuItem({ entry, onSelect }: { entry: CreateEntry; onSelect: () => void }) {
  if (entry.status === CREATE_ENTRY_STATUS.soon) {
    return (
      <span aria-disabled="true" className={cn(CREATE_MENU_ROW_CLASSES, CREATE_MENU_ROW_STATE_CLASSES.soon)}>
        <span className="flex items-center gap-3">
          <Icon name={entry.icon} className="text-icon-sm" />
          {entry.label}
        </span>
        <span className={CREATE_MENU_BADGE_CLASSES}>{CREATE_SOON_BADGE_LABEL}</span>
      </span>
    );
  }

  return (
    <Link
      to={entry.to}
      onClick={onSelect}
      className={cn(CREATE_MENU_ROW_CLASSES, CREATE_MENU_ROW_STATE_CLASSES.available)}
    >
      <span className="flex items-center gap-3">
        <Icon name={entry.icon} className="text-icon-sm text-accent" />
        {entry.label}
      </span>
    </Link>
  );
}
