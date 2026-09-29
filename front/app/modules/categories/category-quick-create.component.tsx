import { useForm } from 'react-hook-form';

import { Button, ChoiceCards, ColorField, Dialog, FormField, IconPicker } from '@components';
import {
  BUTTON_VARIANT,
  CATEGORY_KIND_ICONS,
  CATEGORY_KIND_LABELS,
  CATEGORY_KINDS,
  DEFAULT_ICON_NAME,
  FIELD_CONTROL_CLASSES,
  PRESET_COLORS,
} from '@constants';
import { createCategory } from '@services';
import { useAuthStore } from '@store';
import type { Category, CategoryKind } from '@app-types';
import { toastFromError, toastSuccess } from '@utils';

type CategoryQuickForm = {
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
};

const emptyQuickForm: CategoryQuickForm = {
  name: '',
  icon: DEFAULT_ICON_NAME,
  color: PRESET_COLORS[0],
  kind: 'expense',
};

type CategoryQuickCreateProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (category: Category) => void;
};

export function CategoryQuickCreate({ open, onClose, onCreated }: CategoryQuickCreateProps) {
  const token = useAuthStore((state) => state.token);
  const form = useForm<CategoryQuickForm>({
    defaultValues: emptyQuickForm,
  });

  const kind = form.watch('kind');

  const onSubmit = form.handleSubmit(async (values) => {
    if (!token) return;
    try {
      const category = await createCategory(token, values);
      form.reset(emptyQuickForm);
      toastSuccess('Catégorie créée.');
      onCreated(category);
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
      title="Nouvelle catégorie"
    >
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-5">
        <FormField label="Nom" htmlFor="qc-name">
          <input
            id="qc-name"
            className={FIELD_CONTROL_CLASSES}
            placeholder="Ex. Courses"
            {...form.register('name', { required: true })}
          />
        </FormField>
        <FormField label="Type">
          <ChoiceCards
            label="Type"
            className="grid grid-cols-3 gap-2"
            value={kind}
            options={CATEGORY_KINDS.map((item) => ({
              value: item,
              label: CATEGORY_KIND_LABELS[item],
              icon: CATEGORY_KIND_ICONS[item],
            }))}
            onChange={(next) => form.setValue('kind', next, { shouldDirty: true })}
          />
        </FormField>
        <IconPicker value={form.watch('icon')} onChange={(name) => form.setValue('icon', name)} />
        <ColorField value={form.watch('color')} onChange={(color) => form.setValue('color', color)} />
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
