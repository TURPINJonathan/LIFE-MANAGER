import { useForm } from 'react-hook-form';

import { Button, ColorField, Dialog, FormField, IconPicker } from '@components';
import { BUTTON_VARIANT, FIELD_CONTROL_CLASSES, FIELD_HINT_CLASSES, PRESET_COLORS } from '@constants';
import { createMerchant } from '@services';
import { useAuthStore } from '@store';
import type { Merchant } from '@app-types';
import { toastFromError, toastSuccess } from '@utils';

const DEFAULT_MERCHANT_ICON = 'storefront';

type MerchantQuickForm = {
  name: string;
  icon: string;
  color: string;
};

const emptyQuickForm: MerchantQuickForm = {
  name: '',
  icon: DEFAULT_MERCHANT_ICON,
  color: PRESET_COLORS[0],
};

type MerchantQuickCreateProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (merchant: Merchant) => void;
};

export function MerchantQuickCreate({ open, onClose, onCreated }: MerchantQuickCreateProps) {
  const token = useAuthStore((state) => state.token);
  const form = useForm<MerchantQuickForm>({
    defaultValues: emptyQuickForm,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (!token) return;
    try {
      const merchant = await createMerchant(token, values);
      form.reset(emptyQuickForm);
      toastSuccess('Enseigne créée.');
      onCreated(merchant);
      onClose();
    } catch (err) {
      toastFromError(err, 'Création impossible.');
    }
  });

  return (
    <Dialog
      isOpen={open}
      onClose={() => {
        form.reset(emptyQuickForm);
        onClose();
      }}
      title="Nouvelle enseigne"
    >
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-5">
        <FormField label="Nom" htmlFor="merchant-qc-name">
          <input
            id="merchant-qc-name"
            className={FIELD_CONTROL_CLASSES}
            placeholder="Ex. Carrefour"
            {...form.register('name', { required: true })}
          />
        </FormField>
        <IconPicker value={form.watch('icon')} onChange={(name) => form.setValue('icon', name)} />
        <ColorField value={form.watch('color')} onChange={(color) => form.setValue('color', color)} allowTransparent />
        <p className={FIELD_HINT_CLASSES}>Tu pourras ajouter une image dans Paramètres.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            variant={BUTTON_VARIANT.dangerOutline}
            fullWidth={false}
            className="w-auto px-3"
            onClick={() => {
              form.reset(emptyQuickForm);
              onClose();
            }}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant={BUTTON_VARIANT.success}
            fullWidth={false}
            className="ms-auto w-auto px-4"
            loading={form.formState.isSubmitting}
          >
            Créer et sélectionner
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
