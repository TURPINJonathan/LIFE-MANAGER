import { type CSSProperties, type ReactNode, type RefObject, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { POPOVER_OFFSET, POPOVER_PANEL_CLASSES, POPOVER_PLACEMENT } from '@constants';
import { usePopover } from '@hooks';
import type { PopoverPlacement } from '@app-types';

interface IPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  placement: PopoverPlacement;
  label: string;
  children: ReactNode;
  /** Aligne la largeur du panneau sur l’ancre (bottomStart). Défaut : true. */
  matchAnchorWidth?: boolean;
}

function getPanelStyle(anchor: HTMLElement, placement: PopoverPlacement, matchAnchorWidth: boolean): CSSProperties {
  const rect = anchor.getBoundingClientRect();

  if (placement === POPOVER_PLACEMENT.rightStart) {
    return {
      top: rect.top,
      left: rect.right + POPOVER_OFFSET,
      maxHeight: window.innerHeight - rect.top - POPOVER_OFFSET,
    };
  }

  if (placement === POPOVER_PLACEMENT.bottomStart) {
    return {
      top: rect.bottom + POPOVER_OFFSET,
      left: rect.left,
      ...(matchAnchorWidth ? { width: rect.width } : {}),
      maxHeight: window.innerHeight - rect.bottom - 2 * POPOVER_OFFSET,
    };
  }

  return {
    top: rect.bottom + POPOVER_OFFSET,
    right: window.innerWidth - rect.right,
    maxHeight: window.innerHeight - rect.bottom - 2 * POPOVER_OFFSET,
  };
}

export function Popover({
  isOpen,
  onClose,
  anchorRef,
  placement,
  label,
  children,
  matchAnchorWidth = true,
}: IPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties | null>(null);

  usePopover(isOpen, onClose, panelRef, anchorRef);

  useLayoutEffect(() => {
    if (!isOpen) {
      setStyle(null);
      return;
    }

    function reposition(): void {
      const anchor = anchorRef.current;
      if (anchor) setStyle(getPanelStyle(anchor, placement, matchAnchorWidth));
    }

    reposition();
    window.addEventListener('resize', reposition);
    return () => window.removeEventListener('resize', reposition);
  }, [isOpen, placement, anchorRef, matchAnchorWidth]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-label={label}
      style={style ?? undefined}
      className={POPOVER_PANEL_CLASSES}
    >
      {children}
    </div>,
    document.body,
  );
}
