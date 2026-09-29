import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';
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
  DIALOG_SIZE,
  FIELD_CONTROL_CLASSES,
  FIELD_HINT_CLASSES,
  ICON_BUTTON_VARIANT,
  TRANSPARENT_COLOR,
} from '@constants';
import { CategoryQuickCreate } from '@categories';
import {
  archiveMerchant,
  createMerchant,
  listCategories,
  listMerchants,
  updateMerchant,
  uploadMerchantImage,
} from '@services';
import { useAuthStore } from '@store';
import type { Category, Merchant } from '@app-types';
import { cn, toastError, toastFromError, toastSuccess } from '@utils';

import { MerchantVisual } from './merchant-visual.component';

const DEFAULT_MERCHANT_ICON = 'storefront';

type VisualMode = 'icon' | 'image';

type MerchantFormValues = {
  name: string;
  color: string;
  icon: string;
  visualMode: VisualMode;
  categoryIds: string[];
};

const emptyForm: MerchantFormValues = {
  name: '',
  color: TRANSPARENT_COLOR,
  icon: DEFAULT_MERCHANT_ICON,
  visualMode: 'image',
  categoryIds: [],
};

export function MerchantsSettingsPanel() {
  const token = useAuthStore((state) => state.token);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Merchant | null>(null);
  const [creating, setCreating] = useState(false);
  const [categoryCreateOpen, setCategoryCreateOpen] = useState(false);
  const [pendingArchive, setPendingArchive] = useState<Merchant | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<MerchantFormValues>({ defaultValues: emptyForm });

  const reload = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [merchantRows, categoryRows] = await Promise.all([listMerchants(token), listCategories(token)]);
      setMerchants(merchantRows);
      setCategories(categoryRows);
    } catch (err) {
      toastFromError(err, 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const clearImageSelection = () => {
    setImageFile(null);
    setImagePreviewUrl(null);
  };

  const applyImageFile = (file: File | null) => {
    setImageFile(file);
    setImagePreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const openCreate = () => {
    form.reset(emptyForm);
    clearImageSelection();
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (merchant: Merchant) => {
    const hasImage = merchant.hasImage || Boolean(merchant.imageUrl);
    form.reset({
      name: merchant.name,
      color: merchant.color,
      icon: merchant.icon || DEFAULT_MERCHANT_ICON,
      visualMode: hasImage ? 'image' : 'icon',
      categoryIds: merchant.categoryIds ?? [],
    });
    clearImageSelection();
    setCreating(false);
    setEditing(merchant);
  };

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
    clearImageSelection();
  };

  const onImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    applyImageFile(event.target.files?.[0] ?? null);
    event.target.value = '';
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toastError('Choisis une image (JPEG, PNG ou WebP).');
      return;
    }
    applyImageFile(file);
  };

  const openImagePicker = () => imageInputRef.current?.click();

  const onDropzoneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openImagePicker();
    }
  };

  const saveMerchant = async (values: MerchantFormValues, mode: 'close' | 'new') => {
    if (!token) return;
    const isCreate = !editing;
    try {
      if (editing) {
        if (values.visualMode === 'icon') {
          await updateMerchant(token, editing.id, {
            name: values.name,
            color: values.color,
            icon: values.icon,
            categoryIds: values.categoryIds,
          });
        } else {
          await updateMerchant(token, editing.id, {
            name: values.name,
            color: values.color,
            categoryIds: values.categoryIds,
          });
          if (imageFile) {
            await uploadMerchantImage(token, editing.id, imageFile);
          } else if (!editing.hasImage && !editing.imageUrl) {
            toastError('Choisis une image pour cette enseigne.');
            return;
          }
        }
        toastSuccess('Enseigne mise à jour.');
      } else if (values.visualMode === 'image') {
        if (!imageFile) {
          toastError('Choisis une image pour cette enseigne.');
          return;
        }
        const created = await createMerchant(token, {
          name: values.name,
          color: values.color,
          icon: DEFAULT_MERCHANT_ICON,
          categoryIds: values.categoryIds,
        });
        await uploadMerchantImage(token, created.id, imageFile);
        toastSuccess('Enseigne créée.');
      } else {
        await createMerchant(token, {
          name: values.name,
          color: values.color,
          icon: values.icon,
          categoryIds: values.categoryIds,
        });
        toastSuccess('Enseigne créée.');
      }
      if (mode === 'new' && isCreate) {
        form.reset(emptyForm);
        clearImageSelection();
        setEditing(null);
        setCreating(true);
      } else {
        closeForm();
      }
      await reload();
    } catch (err) {
      toastFromError(err, 'Enregistrement impossible.');
    }
  };

  const onSubmit = form.handleSubmit((values) => saveMerchant(values, 'close'));
  const onSubmitAndNew = form.handleSubmit((values) => saveMerchant(values, 'new'));

  const resetMerchantForm = () => {
    if (editing) {
      const hasImage = editing.hasImage || Boolean(editing.imageUrl);
      form.reset({
        name: editing.name,
        color: editing.color,
        icon: editing.icon || DEFAULT_MERCHANT_ICON,
        visualMode: hasImage ? 'image' : 'icon',
        categoryIds: editing.categoryIds ?? [],
      });
      clearImageSelection();
      return;
    }
    form.reset(emptyForm);
    clearImageSelection();
  };

  const onArchive = async () => {
    if (!token || !pendingArchive) return;
    setArchiveBusy(true);
    try {
      await archiveMerchant(token, pendingArchive.id);
      toastSuccess('Enseigne archivée.');
      setPendingArchive(null);
      await reload();
    } catch (err) {
      toastFromError(err, 'Archivage impossible.');
    } finally {
      setArchiveBusy(false);
    }
  };

  const dialogOpen = creating || editing !== null;
  const watched = form.watch();
  const hasPreview = Boolean(imagePreviewUrl || editing?.imageUrl);
  const previewName = watched.name.trim() || 'Aperçu';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-3">
        <Button type="button" fullWidth={false} className="w-auto px-4" onClick={openCreate}>
          <Icon name="add" className="text-icon-sm" />
          Ajouter
        </Button>
      </div>

      {loading ? (
        <p className="text-body text-fg-muted">Chargement…</p>
      ) : merchants.length === 0 ? (
        <p className="rounded-panel border border-dashed border-border-subtle bg-elevated/50 px-4 py-8 text-center text-body text-fg-muted">
          Aucune enseigne. Crée-en une pour reconnaître tes commerces.
        </p>
      ) : (
        <SectionCard title="Enseignes" icon="storefront">
          <ul className="-mx-1 divide-y divide-border-subtle">
            {merchants.map((merchant) => (
              <li key={merchant.id} className="flex items-center gap-3 px-1 py-3">
                <MerchantVisual
                  name={merchant.name}
                  color={merchant.color}
                  icon={merchant.icon}
                  imageUrl={merchant.imageUrl}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-fg-primary">{merchant.name}</p>
                  <p className="text-control text-fg-muted">
                    {merchant.hasImage || merchant.imageUrl ? 'Image' : 'Icône'}
                    {(merchant.categoryIds?.length ?? 0) > 0
                      ? ` · ${merchant.categoryIds.length} catégorie${merchant.categoryIds.length > 1 ? 's' : ''}`
                      : ''}
                  </p>
                </div>
                <IconButton
                  variant={ICON_BUTTON_VARIANT.ghost}
                  icon="edit"
                  aria-label="Modifier"
                  onClick={() => openEdit(merchant)}
                />
                <IconButton
                  variant={ICON_BUTTON_VARIANT.danger}
                  icon="delete"
                  aria-label="Archiver"
                  onClick={() => setPendingArchive(merchant)}
                />
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <Dialog
        isOpen={dialogOpen}
        onClose={closeForm}
        title={editing ? 'Modifier l’enseigne' : 'Nouvelle enseigne'}
        size={DIALOG_SIZE.wide}
      >
        <form onSubmit={onSubmit} className="mt-4 flex min-h-0 flex-1 flex-col gap-5">
          <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-2">
            <div className="flex min-h-[240px] flex-col gap-3 md:min-h-[320px]">
              <span className="text-control font-medium text-fg-primary">Aperçu</span>
              {watched.visualMode === 'image' ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openImagePicker}
                  onKeyDown={onDropzoneKeyDown}
                  onDragOver={onDragOver}
                  onDragEnter={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={cn(
                    'flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-center gap-4 rounded-panel border border-dashed px-4 py-8 transition-colors',
                    dragging
                      ? 'border-accent bg-accent-tint/40'
                      : 'border-border-subtle bg-elevated/40 hover:border-accent/60',
                  )}
                >
                  {hasPreview ? (
                    <div className="flex w-full flex-col items-center gap-4">
                      {imagePreviewUrl ? (
                        <MerchantVisual
                          name={previewName}
                          color={watched.color}
                          localImageSrc={imagePreviewUrl}
                          className="size-36 rounded-panel"
                          iconClassName="text-4xl"
                        />
                      ) : editing ? (
                        <MerchantVisual
                          name={editing.name}
                          color={watched.color}
                          icon={editing.icon}
                          imageUrl={editing.imageUrl}
                          className="size-36 rounded-panel"
                          iconClassName="text-4xl"
                        />
                      ) : null}
                      <p className="text-center text-control text-fg-secondary">
                        {imageFile?.name ?? 'Image actuelle'} — dépose ou clique pour remplacer
                      </p>
                    </div>
                  ) : (
                    <>
                      <Icon name="upload_file" className="text-4xl text-fg-muted" />
                      <p className="max-w-[16rem] text-center text-body text-fg-secondary">
                        Glisse une image ici, ou clique pour parcourir
                      </p>
                    </>
                  )}
                  <input
                    ref={imageInputRef}
                    id="merchant-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    className="sr-only"
                    onChange={onImageChange}
                    onClick={(event) => event.stopPropagation()}
                  />
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-panel border border-border-subtle bg-elevated/40 px-4 py-8">
                  <MerchantVisual
                    name={previewName}
                    color={watched.color}
                    icon={watched.icon}
                    className="size-36 rounded-panel"
                    iconClassName="text-4xl"
                  />
                  <p className="text-center text-control text-fg-muted">{previewName}</p>
                </div>
              )}
              {watched.visualMode === 'image' && (
                <p className={FIELD_HINT_CLASSES}>PNG, JPG ou WebP. L’icône sera remplacée par l’image.</p>
              )}
            </div>

            <div className="flex flex-col gap-5">
              <FormField label="Nom" htmlFor="merchant-name">
                <input
                  id="merchant-name"
                  className={FIELD_CONTROL_CLASSES}
                  placeholder="Ex. Carrefour"
                  {...form.register('name', { required: true })}
                />
              </FormField>

              <ColorField
                value={watched.color}
                onChange={(color) => form.setValue('color', color, { shouldDirty: true })}
                allowTransparent
              />

              <FormField label="Visuel">
                <ChoiceCards
                  label="Visuel"
                  className="grid grid-cols-2 gap-2"
                  value={watched.visualMode}
                  options={[
                    { value: 'icon' as const, label: 'Icône', icon: 'category' },
                    { value: 'image' as const, label: 'Image', icon: 'image' },
                  ]}
                  onChange={(mode) => form.setValue('visualMode', mode, { shouldDirty: true })}
                />
              </FormField>

              {watched.visualMode === 'icon' ? (
                <IconPicker
                  value={watched.icon}
                  onChange={(icon) => form.setValue('icon', icon, { shouldDirty: true })}
                />
              ) : null}

              <FormField label="Catégories liées">
                {categories.length === 0 ? (
                  <p className={FIELD_HINT_CLASSES}>Aucune catégorie à lier pour le moment.</p>
                ) : (
                  <ul className="max-h-40 space-y-1 overflow-y-auto rounded-control border border-border-subtle p-2">
                    {categories.map((category) => {
                      const checked = watched.categoryIds.includes(category.id);
                      return (
                        <li key={category.id}>
                          <label className="flex cursor-pointer items-center gap-2 rounded-control-sm px-1 py-1.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked
                                  ? watched.categoryIds.filter((id) => id !== category.id)
                                  : [...watched.categoryIds, category.id];
                                form.setValue('categoryIds', next, { shouldDirty: true });
                              }}
                              className="size-4 accent-[var(--accent)]"
                            />
                            <span
                              className="flex size-7 shrink-0 items-center justify-center rounded-control text-white"
                              style={{ backgroundColor: category.color }}
                            >
                              <Icon name={category.icon} className="text-[13px]!" />
                            </span>
                            <span className="truncate text-body text-fg-primary">{category.name}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <Button
                  type="button"
                  variant={BUTTON_VARIANT.ghost}
                  fullWidth={false}
                  className="mt-2 h-10 w-auto px-3 text-control"
                  onClick={() => setCategoryCreateOpen(true)}
                >
                  <Icon name="add" className="text-icon-sm" />
                  Nouvelle catégorie
                </Button>
              </FormField>

              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant={BUTTON_VARIANT.dangerOutline}
                  fullWidth={false}
                  className="w-auto px-3"
                  onClick={closeForm}
                >
                  Annuler
                </Button>
                {form.formState.isDirty || imageFile ? (
                  <Button
                    type="button"
                    variant={BUTTON_VARIANT.neutral}
                    fullWidth={false}
                    className="w-auto px-3"
                    onClick={resetMerchantForm}
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
            </div>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        isOpen={pendingArchive !== null}
        onClose={() => setPendingArchive(null)}
        onConfirm={() => void onArchive()}
        title="Archiver l’enseigne"
        message={pendingArchive ? `Archiver l’enseigne « ${pendingArchive.name} » ?` : ''}
        confirmLabel="Archiver"
        confirmVariant={BUTTON_VARIANT.danger}
        busy={archiveBusy}
      />

      <CategoryQuickCreate
        open={categoryCreateOpen}
        onClose={() => setCategoryCreateOpen(false)}
        onCreated={(category) => {
          setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name, 'fr')));
          const current = form.getValues('categoryIds');
          if (!current.includes(category.id)) {
            form.setValue('categoryIds', [...current, category.id], { shouldDirty: true });
          }
        }}
      />
    </div>
  );
}
