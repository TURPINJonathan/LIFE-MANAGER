import { type RefObject, useCallback, useRef, useState } from 'react';

export function useDismissiblePanel(): {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
} {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const open = useCallback((): void => setIsOpen(true), []);
  const close = useCallback((): void => setIsOpen(false), []);
  return { isOpen, open, close, triggerRef };
}
