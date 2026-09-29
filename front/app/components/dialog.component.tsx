import { type ReactNode, useRef } from 'react';
import { createPortal } from 'react-dom';

import { Button, Icon, IconButton, Typography } from '@components';
import { BUTTON_VARIANT, DIALOG_SIZE, DIALOG_SIZE_CLASSES, ICON_BUTTON_VARIANT } from '@constants';
import { useOverlay } from '@hooks';
import type { DialogSize } from '@app-types';
import { cn } from '@utils';

interface IDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  children: ReactNode;
  size?: DialogSize;
}

export function Dialog({ isOpen, onClose, title, icon, children, size = DIALOG_SIZE.default }: IDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useOverlay(isOpen, onClose, dialogRef);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <Button variant={BUTTON_VARIANT.backdrop} tabIndex={-1} aria-label="Fermer" onClick={onClose} />
      <div className={DIALOG_SIZE_CLASSES[size]}>
        <div className="flex shrink-0 items-center justify-between gap-2">
          {icon !== undefined && <Icon name={icon} className="text-icon-sm! shrink-0 text-fg-muted" />}
          <Typography variant="title" as="h2" className="min-w-0 flex-1">
            {title}
          </Typography>
          <IconButton variant={ICON_BUTTON_VARIANT.ghost} icon="close" onClick={onClose} aria-label="Fermer" />
        </div>
        <div
          className={cn(
            'min-h-0 flex-1',
            size === DIALOG_SIZE.large || size === DIALOG_SIZE.wide || size === DIALOG_SIZE.full
              ? 'flex flex-col overflow-hidden'
              : 'overflow-y-auto',
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
