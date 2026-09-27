import { create, type StateCreator } from 'zustand';

interface IUiState {
  isMenuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  reset: () => void;
}

const INITIAL_UI_STATE = {
  isMenuOpen: false,
} as const;

const uiStateCreator: StateCreator<IUiState> = (set) => ({
  ...INITIAL_UI_STATE,
  openMenu: () => set({ isMenuOpen: true }),
  closeMenu: () => set({ isMenuOpen: false }),
  reset: () => set(INITIAL_UI_STATE),
});

export const useUiStore = create<IUiState>()(uiStateCreator);
