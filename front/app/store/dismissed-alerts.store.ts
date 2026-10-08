import { create, type StateCreator } from 'zustand';

import { DISMISSED_ALERTS_STORAGE_KEY } from '@constants';

function readDismissed(): Record<string, true> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DISMISSED_ALERTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, true> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value) out[key] = true;
    }
    return out;
  } catch {
    return {};
  }
}

function writeDismissed(map: Record<string, true>) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(DISMISSED_ALERTS_STORAGE_KEY, JSON.stringify(map));
}

interface IDismissedAlertsState {
  dismissed: Record<string, true>;
  isDismissed: (key: string) => boolean;
  dismiss: (key: string) => void;
  dismissMany: (keys: string[]) => void;
}

const dismissedAlertsCreator: StateCreator<IDismissedAlertsState> = (set, get) => ({
  dismissed: readDismissed(),
  isDismissed: (key) => Boolean(get().dismissed[key]),
  dismiss: (key) => {
    if (get().dismissed[key]) return;
    const next = { ...get().dismissed, [key]: true as const };
    writeDismissed(next);
    set({ dismissed: next });
  },
  dismissMany: (keys) => {
    const next = { ...get().dismissed };
    let changed = false;
    for (const key of keys) {
      if (!next[key]) {
        next[key] = true;
        changed = true;
      }
    }
    if (!changed) return;
    writeDismissed(next);
    set({ dismissed: next });
  },
});

export const useDismissedAlertsStore = create<IDismissedAlertsState>()(dismissedAlertsCreator);
