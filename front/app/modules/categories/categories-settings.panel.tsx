import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  Button,
  ChoiceCards,
  ColorField,
  ConfirmDialog,
  Dialog,
  FormField,
  Icon,
  IconButton,
  IconPicker,
  SectionCard,
} from '@components';
import {
  BUTTON_VARIANT,
  CATEGORY_KIND_ICONS,
  CATEGORY_KIND_LABELS,
  CATEGORY_KINDS,
  DEFAULT_ICON_NAME,
  FIELD_CONTROL_CLASSES,
  FIELD_HINT_CLASSES,
  ICON_BUTTON_VARIANT,
  PRESET_COLORS,
} from '@constants';
import { MerchantVisual } from '@merchants';
import {
  ApiError,
  archiveCategory,
  createCategory,
  listCategories,
  listMerchants,
  updateCategory,
} from '@services';
import { useAuthStore } from '@store';
import type { Category, CategoryKind, Merchant } from '@app-types';
import { cn, toastFromError, toastSuccess } from '@utils';

type CategoryFormValues = {
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
  merchantIds: string[];
  favoriteMerchantId: string | null;
};

const emptyForm: CategoryFormValues = {
  name: '',
  icon: DEFAULT_ICON_NAME,
  color: PRESET_COLORS[0],
  kind: 'expense',
  merchantIds: [],
  favoriteMerchantId: null,
};

export function CategoriesSettingsPanel() {
  const token = useAuthStore((state) => state.token);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingArchive, setPendingArchive] = useState<Category | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const form = useForm<CategoryFormValues>({ defaultValues: emptyForm });

  const reload = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [cats, merchantRows] = await Promise.all([listCategories(token), listMerchants(token)]);
      setCategories(cats);
      setMerchants(merchantRows);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chargement impossible.');
      toastFromError(err, 'Chargement des catégories impossible.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openCreate = () => {
    form.reset(emptyForm);
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (category: Category) => {
    form.reset({
      name: category.name,
      icon: category.icon,
      color: category.color,
      kind: category.kind,
      merchantIds: category.merchantIds ?? [],
      favoriteMerchantId: category.favoriteMerchantId,
    });
    setCreating(false);
    setEditing(category);
  };

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const toggleMerchant = (merchantId: string) => {
    const current = form.getValues('merchantIds');
    const next = current.includes(merchantId)
      ? current.filter((id) => id !== merchantId)
      : [...current, merchantId];
    form.setValue('merchantIds', next, { shouldDirty: true });
    const favorite = form.getValues('favoriteMerchantId');
    if (next.length === 1) {
      form.setValue('favoriteMerchantId', next[0], { shouldDirty: true });
    } else if (favorite && !next.includes(favorite)) {
      form.setValue('favoriteMerchantId', null, { shouldDirty: true });
    }
  };

  const saveCategory = async (values: CategoryFormValues, mode: 'close' | 'new') => {
    if (!token) return;
    const isCreate = !editing;
    setError(null);
    try {
      const payload = {
        name: values.name,
        icon: values.icon,
        color: values.color,
        kind: values.kind,
        merchantIds: values.merchantIds,
        favoriteMerchantId: values.favoriteMerchantId,
      };
      if (editing) {
        await updateCategory(token, editing.id, payload);
        toastSuccess('Catégorie mise à jour.');
      } else {
        await createCategory(token, payload);
        toastSuccess('Catégorie créée.');
      }
      if (mode === 'new' && isCreate) {
        form.reset(emptyForm);
        setCreating(true);
        setEditing(null);
      } else {
        closeForm();
      }
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Enregistrement impossible.');
      toastFromError(err, 'Enregistrement impossible.');
    }
  };

  const onSubmit = form.handleSubmit((values) => saveCategory(values, 'close'));
  const onSubmitAndNew = form.handleSubmit((values) => saveCategory(values, 'new'));

  const resetCategoryForm = () => {
    if (editing) {
      form.reset({
        name: editing.name,
        icon: editing.icon,
        color: editing.color,
        kind: editing.kind,
        merchantIds: editing.merchantIds ?? [],
        favoriteMerchantId: editing.favoriteMerchantId,
      });
      return;
    }
    form.reset(emptyForm);
  };

  const onArchive = async () => {
    if (!token || !pendingArchive) return;
    setArchiveBusy(true);
    setError(null);
    try {
      await archiveCategory(token, pendingArchive.id);
      toastSuccess('Catégorie archivée.');
      setPendingArchive(null);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Archivage impossible.');
      toastFromError(err, 'Archivage impossible.');
    } finally {
      setArchiveBusy(false);
    }
  };

  const dialogOpen = creating || editing !== null;
  const watched = form.watch();
  const linkedCount = watched.merchantIds.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-3">
        <Button type="button" fullWidth={false} className="w-auto px-4" onClick={openCreate}>
          <Icon name="add" className="text-icon-sm" />
          Ajouter
        </Button>
      </div>

      {error && (
        <p className="text-control text-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-body text-fg-muted">Chargement…</p>
      ) : categories.length === 0 ? (
        <p className="rounded-panel border border-dashed border-border-subtle bg-elevated/50 px-4 py-8 text-center text-body text-fg-muted">
          Aucune catégorie. Crée-en une pour classer tes opérations.
        </p>
      ) : (
        <SectionCard title="Catégories" icon="category">
          <ul className="-mx-1 divide-y divide-border-subtle">
            {categories.map((category) => (
              <li key={category.id} className="flex items-center gap-3 px-1 py-3">
                <span
                  className="flex size-10 items-center justify-center rounded-control text-white"
                  style={{ backgroundColor: category.color }}
                >
                  <Icon name={category.icon} className="text-icon" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-fg-primary">{category.name}</p>
                  <p className="text-control text-fg-muted">
                    {CATEGORY_KIND_LABELS[category.kind]}
                    {(category.merchantIds?.length ?? 0) > 0
                      ? ` · ${category.merchantIds.length} enseigne${category.merchantIds.length > 1 ? 's' : ''}`
                      : ''}
                  </p>
                </div>
                <IconButton
                  variant={ICON_BUTTON_VARIANT.ghost}
                  icon="edit"
                  aria-label="Modifier"
                  onClick={() => openEdit(category)}
                />
                <IconButton
                  variant={ICON_BUTTON_VARIANT.danger}
                  icon="delete"
                  aria-label="Archiver"
                  onClick={() => setPendingArchive(category)}
                />
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <Dialog isOpen={dialogOpen} onClose={closeForm} title={editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-5">
          <FormField label="Nom" htmlFor="category-name">
            <input
              id="category-name"
              className={FIELD_CONTROL_CLASSES}
              placeholder="Ex. Loyer"
              {...form.register('name', { required: true })}
            />
          </FormField>

          <IconPicker value={watched.icon} onChange={(icon) => form.setValue('icon', icon, { shouldDirty: true })} />
          <ColorField
            value={watched.color}
            onChange={(color) => form.setValue('color', color, { shouldDirty: true })}
          />

          <FormField label="Type">
            <ChoiceCards
              label="Type"
              className="grid grid-cols-3 gap-2"
              value={watched.kind}
              options={CATEGORY_KINDS.map((kind) => ({
                value: kind,
                label: CATEGORY_KIND_LABELS[kind],
                icon: CATEGORY_KIND_ICONS[kind],
              }))}
              onChange={(kind) => form.setValue('kind', kind, { shouldDirty: true })}
            />
          </FormField>

          <FormField label="Enseignes liées">
            {merchants.length === 0 ? (
              <p className={FIELD_HINT_CLASSES}>Aucune enseigne à lier pour le moment.</p>
            ) : (
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-control border border-border-subtle p-2">
                {merchants.map((merchant) => {
                  const checked = watched.merchantIds.includes(merchant.id);
                  const isFavorite = watched.favoriteMerchantId === merchant.id;
                  return (
                    <li key={merchant.id} className="flex items-center gap-2 rounded-control-sm px-1 py-1.5">
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMerchant(merchant.id)}
                          className="size-4 accent-[var(--accent)]"
                        />
                        <MerchantVisual
                          name={merchant.name}
                          color={merchant.color}
                          icon={merchant.icon}
                          imageUrl={merchant.imageUrl}
                          className="size-7"
                          iconClassName="text-[13px]!"
                          showNativeTitle={false}
                        />
                        <span className="truncate text-body text-fg-primary">{merchant.name}</span>
                      </label>
                      {checked ? (
                        <button
                          type="button"
                          aria-label={isFavorite ? 'Favori' : 'Définir comme favori'}
                          title={isFavorite ? 'Favori' : 'Définir comme favori'}
                          disabled={linkedCount === 1}
                          onClick={() =>
                            form.setValue('favoriteMerchantId', merchant.id, { shouldDirty: true })
                          }
                          className={cn(
                            'flex size-8 cursor-pointer items-center justify-center rounded-control transition-colors',
                            isFavorite ? 'text-warning' : 'text-fg-muted hover:text-fg-secondary',
                            linkedCount === 1 && 'cursor-default',
                          )}
                        >
                          <Icon name={isFavorite ? 'star' : 'star'} className={cn('text-icon-sm', isFavorite && 'icon-filled')} />
                        </button>
                      ) : (
                        <span className="size-8" />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className={FIELD_HINT_CLASSES}>
              Une enseigne favorite est proposée automatiquement à la saisie d’opération.
              {linkedCount === 1 ? ' Avec une seule enseigne, elle est favorite.' : ''}
            </p>
          </FormField>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant={BUTTON_VARIANT.dangerOutline}
              fullWidth={false}
              className="w-auto px-3"
              onClick={closeForm}
            >
              Annuler
            </Button>
            {form.formState.isDirty ? (
              <Button
                type="button"
                variant={BUTTON_VARIANT.neutral}
                fullWidth={false}
                className="w-auto px-3"
                onClick={resetCategoryForm}
              >
                Réinitialiser
              </Button>
            ) : null}
            <div className="ms-auto flex flex-wrap gap-2">
              {creating ? (
                <Button
                  type="button"
                  variant={BUTTON_VARIANT.successOutline}
                  fullWidth={false}
                  className="w-auto px-3"
                  loading={form.formState.isSubmitting}
                  onClick={() => void onSubmitAndNew()}
                >
                  Enregistrer et continuer
                </Button>
              ) : null}
              <Button
                type="submit"
                variant={BUTTON_VARIANT.success}
                fullWidth={false}
                className="w-auto px-4"
                loading={form.formState.isSubmitting}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        isOpen={pendingArchive !== null}
        onClose={() => setPendingArchive(null)}
        onConfirm={() => void onArchive()}
        title="Archiver la catégorie"
        message={pendingArchive ? `Archiver la catégorie « ${pendingArchive.name} » ?` : ''}
        confirmLabel="Archiver"
        confirmVariant={BUTTON_VARIANT.danger}
        busy={archiveBusy}
      />
    </div>
  );
}
