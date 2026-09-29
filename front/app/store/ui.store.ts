import { create, type StateCreator } from 'zustand';

export type ToastTone = 'info' | 'success' | 'error';

export type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

interface IUiState {
  isMenuOpen: boolean;
  toasts: ToastItem[];
  openMenu: () => void;
  closeMenu: () => void;
  pushToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: string) => void;
  reset: () => void;
}

const INITIAL_UI_STATE = {
  isMenuOpen: false,
  toasts: [] as ToastItem[],
} as const;

const TOAST_TTL_MS = 5_500;

const uiStateCreator: StateCreator<IUiState> = (set, get) => ({
  ...INITIAL_UI_STATE,
  openMenu: () => set({ isMenuOpen: true }),
  closeMenu: () => set({ isMenuOpen: false }),
  pushToast: (message, tone = 'info') => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
    window.setTimeout(() => {
      get().dismissToast(id);
    }, TOAST_TTL_MS);
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  reset: () => set({ ...INITIAL_UI_STATE, toasts: [] }),
});

export const useUiStore = create<IUiState>()(uiStateCreator);
