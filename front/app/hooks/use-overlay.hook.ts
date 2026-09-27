import { type RefObject, useEffect, useRef } from 'react';

import { FOCUSABLE_SELECTOR } from '@constants';

const AUTOFOCUS_SELECTOR = '[data-autofocus]';
const APP_SCROLL_SELECTOR = '[data-app-scroll]';

let scrollLockCount = 0;
let lockedScrollElement: HTMLElement | null = null;
let savedScrollOverflow = '';
const overlayStack: object[] = [];

function getScrollContainer(): HTMLElement {
  const nodes = document.querySelectorAll<HTMLElement>(APP_SCROLL_SELECTOR);
  return nodes[nodes.length - 1] ?? document.body;
}

function lockScroll(): void {
  if (scrollLockCount === 0) {
    lockedScrollElement = getScrollContainer();
    savedScrollOverflow = lockedScrollElement.style.overflow;
    lockedScrollElement.style.overflow = 'hidden';
  }
  scrollLockCount += 1;
}

function unlockScroll(): void {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0 && lockedScrollElement !== null) {
    lockedScrollElement.style.overflow = savedScrollOverflow;
    lockedScrollElement = null;
  }
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export function useOverlay(isOpen: boolean, close: () => void, containerRef?: RefObject<HTMLElement | null>): void {
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!isOpen) return;

    const token = {};
    overlayStack.push(token);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    lockScroll();

    const container = containerRef?.current;
    if (container) {
      const focusable = getFocusable(container);
      (container.querySelector<HTMLElement>(AUTOFOCUS_SELECTOR) ?? focusable[0] ?? container).focus();
    }

    function onKey(event: KeyboardEvent): void {
      if (overlayStack[overlayStack.length - 1] !== token) return;
      if (event.key === 'Escape') {
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !container) return;

      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const index = overlayStack.indexOf(token);
      if (index !== -1) overlayStack.splice(index, 1);
      unlockScroll();
      previouslyFocused?.focus?.();
    };
  }, [isOpen, containerRef]);
}
