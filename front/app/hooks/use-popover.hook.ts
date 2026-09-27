import { type RefObject, useEffect } from 'react';

import { FOCUSABLE_SELECTOR } from '@constants';

const AUTOFOCUS_SELECTOR = '[data-autofocus]';

export function usePopover(
  isOpen: boolean,
  close: () => void,
  panelRef: RefObject<HTMLElement | null>,
  anchorRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!isOpen) return;

    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (panel) {
      const focusable =
        panel.querySelector<HTMLElement>(AUTOFOCUS_SELECTOR) ?? panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (focusable ?? panel).focus();
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      close();
    }

    function onPointerDown(event: PointerEvent): void {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) === true) return;
      if (anchorRef.current?.contains(target) === true) return;
      close();
    }

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown);
      anchor?.focus?.();
    };
  }, [isOpen, close, panelRef, anchorRef]);
}
