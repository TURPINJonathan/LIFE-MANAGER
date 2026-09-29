import { Icon, IconButton } from '@components';
import { ICON_BUTTON_VARIANT } from '@constants';
import { useUiStore, type ToastTone } from '@store';
import { cn } from '@utils';

const TONE_CLASSES: Record<ToastTone, string> = {
  info: 'border-border bg-card text-fg-primary',
  success: 'border-success/30 bg-card text-fg-primary',
  error: 'border-error/30 bg-card text-fg-primary',
};

const TONE_ICON: Record<ToastTone, string> = {
  info: 'info',
  success: 'check_circle',
  error: 'error',
};

const TONE_ICON_COLOR: Record<ToastTone, string> = {
  info: 'text-accent-press',
  success: 'text-success-strong dark:text-success',
  error: 'text-error',
};

export function ToastHost() {
  const toasts = useUiStore((state) => state.toasts);
  const dismissToast = useUiStore((state) => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--app-tab-nav-block-size)+0.75rem)] z-[60] flex flex-col items-center gap-2 px-3 md:bottom-6"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-panel border px-3 py-2.5 shadow-lg animate-art-in',
            TONE_CLASSES[toast.tone],
          )}
          role="status"
        >
          <Icon
            name={TONE_ICON[toast.tone]}
            className={cn('mt-0.5 shrink-0 text-[1.25rem]!', TONE_ICON_COLOR[toast.tone])}
          />
          <p className="min-w-0 flex-1 text-control leading-snug">{toast.message}</p>
          <IconButton
            variant={ICON_BUTTON_VARIANT.ghost}
            icon="close"
            aria-label="Fermer"
            onClick={() => dismissToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}
