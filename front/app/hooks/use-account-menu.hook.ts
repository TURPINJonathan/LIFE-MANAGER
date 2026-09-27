import { useUiStore } from '@store';

export function useAccountMenu() {
  const isOpen = useUiStore((state) => state.isMenuOpen);
  const close = useUiStore((state) => state.closeMenu);
  return { isOpen, close };
}
