import { Button, Dialog } from '@components';
import { BUTTON_VARIANT } from '@constants';

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: typeof BUTTON_VARIANT.danger | typeof BUTTON_VARIANT.warning | typeof BUTTON_VARIANT.success;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  confirmVariant = BUTTON_VARIANT.danger,
  busy = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} icon="warning">
      <div className="flex flex-col gap-4 pt-2">
        <p className="text-body text-fg-secondary">{message}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant={BUTTON_VARIANT.dangerOutline}
            fullWidth={false}
            className="w-auto px-4"
            disabled={busy}
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            fullWidth={false}
            className="w-auto px-4"
            loading={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
