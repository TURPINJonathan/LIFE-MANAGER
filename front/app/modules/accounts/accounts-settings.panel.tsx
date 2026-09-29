import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  Button,
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
  DEFAULT_ICON_NAME,
  FIELD_CONTROL_CLASSES,
  ICON_BUTTON_VARIANT,
  PRESET_COLORS,
} from '@constants';
import {
  ApiError,
  archiveAccount,
  archiveSubAccount,
  createAccount,
  createSubAccount,
  listAccounts,
  updateAccount,
  updateSubAccount,
} from '@services';
import { useAuthStore } from '@store';
import type { Account, SubAccount } from '@app-types';
import { toastFromError, toastSuccess } from '@utils';

type AccountForm = { name: string; notes: string };
type SubAccountForm = { name: string; icon: string; color: string };
type PendingArchive = { type: 'account'; id: string; label: string } | { type: 'sub'; id: string; label: string };

export function AccountsSettingsPanel() {
  const token = useAuthStore((state) => state.token);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountDialog, setAccountDialog] = useState<'create' | Account | null>(null);
  const [subDialog, setSubDialog] = useState<{ account: Account; sub?: SubAccount } | null>(null);
  const [pendingArchive, setPendingArchive] = useState<PendingArchive | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);

  const accountForm = useForm<AccountForm>({ defaultValues: { name: '', notes: '' } });
  const subForm = useForm<SubAccountForm>({
    defaultValues: { name: '', icon: 'account_balance', color: PRESET_COLORS[0] },
  });

  const reload = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setAccounts(await listAccounts(token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const saveAccount = async (values: AccountForm, mode: 'close' | 'new') => {
    if (!token) return;
    const isCreate = accountDialog === 'create';
    try {
      if (accountDialog && accountDialog !== 'create') {
        await updateAccount(token, accountDialog.id, {
          name: values.name,
          notes: values.notes || null,
        });
        toastSuccess('Compte mis à jour.');
      } else {
        await createAccount(token, { name: values.name, notes: values.notes || null });
        toastSuccess('Compte créé.');
      }
      if (mode === 'new' && isCreate) {
        accountForm.reset({ name: '', notes: '' });
      } else {
        setAccountDialog(null);
      }
      await reload();
    } catch (err) {
      toastFromError(err, 'Enregistrement impossible.');
    }
  };

  const submitAccount = accountForm.handleSubmit((values) => saveAccount(values, 'close'));
  const submitAccountAndNew = accountForm.handleSubmit((values) => saveAccount(values, 'new'));

  const saveSub = async (values: SubAccountForm, mode: 'close' | 'new') => {
    if (!token || !subDialog) return;
    const isCreate = !subDialog.sub;
    const parentAccount = subDialog.account;
    try {
      if (subDialog.sub) {
        await updateSubAccount(token, subDialog.sub.id, {
          name: values.name,
          icon: values.icon,
          color: values.color,
        });
        toastSuccess('Sous-compte mis à jour.');
      } else {
        await createSubAccount(token, subDialog.account.id, {
          name: values.name,
          icon: values.icon,
          color: values.color,
          openingBalanceCents: 0,
        });
        toastSuccess('Sous-compte créé.');
      }
      if (mode === 'new' && isCreate) {
        subForm.reset({
          name: '',
          icon: DEFAULT_ICON_NAME === 'category' ? 'account_balance' : DEFAULT_ICON_NAME,
          color: PRESET_COLORS[0],
        });
        setSubDialog({ account: parentAccount });
      } else {
        setSubDialog(null);
      }
      await reload();
    } catch (err) {
      toastFromError(err, 'Enregistrement impossible.');
    }
  };

  const submitSub = subForm.handleSubmit((values) => saveSub(values, 'close'));
  const submitSubAndNew = subForm.handleSubmit((values) => saveSub(values, 'new'));

  const resetAccountForm = () => {
    if (accountDialog && accountDialog !== 'create') {
      accountForm.reset({ name: accountDialog.name, notes: accountDialog.notes ?? '' });
      return;
    }
    accountForm.reset({ name: '', notes: '' });
  };

  const resetSubForm = () => {
    if (subDialog?.sub) {
      subForm.reset({
        name: subDialog.sub.name,
        icon: subDialog.sub.icon,
        color: subDialog.sub.color,
      });
      return;
    }
    subForm.reset({
      name: '',
      icon: DEFAULT_ICON_NAME === 'category' ? 'account_balance' : DEFAULT_ICON_NAME,
      color: PRESET_COLORS[0],
    });
  };

  const watchedSub = subForm.watch();

  const confirmArchive = async () => {
    if (!token || !pendingArchive) return;
    setArchiveBusy(true);
    try {
      if (pendingArchive.type === 'account') {
        await archiveAccount(token, pendingArchive.id);
        toastSuccess('Compte archivé.');
      } else {
        await archiveSubAccount(token, pendingArchive.id);
        toastSuccess('Sous-compte archivé.');
      }
      setPendingArchive(null);
      await reload();
    } catch (err) {
      toastFromError(err, 'Archivage impossible.');
    } finally {
      setArchiveBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          fullWidth={false}
          className="h-11 w-auto px-4"
          onClick={() => {
            accountForm.reset({ name: '', notes: '' });
            setAccountDialog('create');
          }}
        >
          <Icon name="add" className="text-icon-sm" />
          Compte
        </Button>
      </div>

      {error && (
        <p className="text-control text-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-body text-fg-muted">Chargement…</p>
      ) : accounts.length === 0 ? (
        <EmptyStateHint />
      ) : (
        <div className="flex flex-col gap-4">
          {accounts.map((account) => (
            <SectionCard
              key={account.id}
              title={account.name}
              icon="folder"
              headerAction={
                <div className="relative z-10 flex gap-1">
                  <IconButton
                    variant={ICON_BUTTON_VARIANT.ghost}
                    icon="edit"
                    aria-label="Modifier le compte"
                    onClick={() => {
                      accountForm.reset({ name: account.name, notes: account.notes ?? '' });
                      setAccountDialog(account);
                    }}
                  />
                  <IconButton
                    variant={ICON_BUTTON_VARIANT.danger}
                    icon="delete"
                    aria-label="Archiver le compte"
                    onClick={() => setPendingArchive({ type: 'account', id: account.id, label: account.name })}
                  />
                </div>
              }
            >
              {account.notes && <p className="-mt-1 text-control text-fg-muted">{account.notes}</p>}
              <ul className="divide-y divide-border-subtle border-t border-border-subtle">
                {account.subAccounts.length === 0 ? (
                  <li className="py-3 text-body text-fg-muted">Aucun sous-compte.</li>
                ) : (
                  account.subAccounts.map((sub) => (
                    <li key={sub.id} className="flex items-center gap-3 py-2.5">
                      <span
                        className="flex size-9 items-center justify-center rounded-control text-white"
                        style={{ backgroundColor: sub.color }}
                      >
                        <Icon name={sub.icon} className="text-icon-sm" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-body font-medium">{sub.name}</span>
                      <div className="flex gap-1">
                        <IconButton
                          variant={ICON_BUTTON_VARIANT.ghost}
                          icon="edit"
                          aria-label="Modifier le sous-compte"
                          onClick={() => {
                            subForm.reset({
                              name: sub.name,
                              icon: sub.icon,
                              color: sub.color,
                            });
                            setSubDialog({ account, sub });
                          }}
                        />
                        <IconButton
                          variant={ICON_BUTTON_VARIANT.danger}
                          icon="delete"
                          aria-label="Archiver le sous-compte"
                          onClick={() => setPendingArchive({ type: 'sub', id: sub.id, label: sub.name })}
                        />
                      </div>
                    </li>
                  ))
                )}
              </ul>

              <Button
                type="button"
                variant={BUTTON_VARIANT.secondary}
                fullWidth={false}
                className="mt-1 w-auto px-3"
                onClick={() => {
                  subForm.reset({
                    name: '',
                    icon: DEFAULT_ICON_NAME === 'category' ? 'account_balance' : DEFAULT_ICON_NAME,
                    color: PRESET_COLORS[0],
                  });
                  setSubDialog({ account });
                }}
              >
                <Icon name="add" className="text-icon-sm" />
                Sous-compte
              </Button>
            </SectionCard>
          ))}
        </div>
      )}

      <Dialog
        isOpen={accountDialog !== null}
        onClose={() => setAccountDialog(null)}
        title={accountDialog === 'create' ? 'Nouveau compte' : 'Modifier le compte'}
      >
        <form onSubmit={submitAccount} className="mt-4 flex flex-col gap-5">
          <FormField label="Nom" htmlFor="account-name">
            <input
              id="account-name"
              className={FIELD_CONTROL_CLASSES}
              placeholder="Ex. Banque principale"
              {...accountForm.register('name', { required: true })}
            />
          </FormField>
          <FormField label="Notes" htmlFor="account-notes" hint="Optionnel">
            <textarea
              id="account-notes"
              rows={3}
              className={`${FIELD_CONTROL_CLASSES} h-auto py-2`}
              {...accountForm.register('notes')}
            />
          </FormField>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant={BUTTON_VARIANT.dangerOutline}
              fullWidth={false}
              className="w-auto px-3"
              onClick={() => setAccountDialog(null)}
            >
              Annuler
            </Button>
            {accountForm.formState.isDirty ? (
              <Button
                type="button"
                variant={BUTTON_VARIANT.neutral}
                fullWidth={false}
                className="w-auto px-3"
                onClick={resetAccountForm}
              >
                Réinitialiser
              </Button>
            ) : null}
            <div className="ms-auto flex flex-wrap gap-2">
              {accountDialog === 'create' ? (
                <Button
                  type="button"
                  variant={BUTTON_VARIANT.successOutline}
                  fullWidth={false}
                  className="w-auto px-3"
                  loading={accountForm.formState.isSubmitting}
                  onClick={() => void submitAccountAndNew()}
                >
                  Enregistrer et continuer
                </Button>
              ) : null}
              <Button
                type="submit"
                variant={BUTTON_VARIANT.success}
                fullWidth={false}
                className="w-auto px-4"
                loading={accountForm.formState.isSubmitting}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </form>
      </Dialog>

      <Dialog
        isOpen={subDialog !== null}
        onClose={() => setSubDialog(null)}
        title={subDialog?.sub ? 'Modifier le sous-compte' : 'Nouveau sous-compte'}
      >
        <form onSubmit={submitSub} className="mt-4 flex flex-col gap-5">
          <FormField label="Nom" htmlFor="sub-name">
            <input
              id="sub-name"
              className={FIELD_CONTROL_CLASSES}
              placeholder="Ex. Courant"
              {...subForm.register('name', { required: true })}
            />
          </FormField>
          <IconPicker
            value={watchedSub.icon}
            onChange={(icon) => subForm.setValue('icon', icon, { shouldDirty: true })}
          />
          <ColorField
            value={watchedSub.color}
            onChange={(color) => subForm.setValue('color', color, { shouldDirty: true })}
          />
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant={BUTTON_VARIANT.dangerOutline}
              fullWidth={false}
              className="w-auto px-3"
              onClick={() => setSubDialog(null)}
            >
              Annuler
            </Button>
            {subForm.formState.isDirty ? (
              <Button
                type="button"
                variant={BUTTON_VARIANT.neutral}
                fullWidth={false}
                className="w-auto px-3"
                onClick={resetSubForm}
              >
                Réinitialiser
              </Button>
            ) : null}
            <div className="ms-auto flex flex-wrap gap-2">
              {!subDialog?.sub ? (
                <Button
                  type="button"
                  variant={BUTTON_VARIANT.successOutline}
                  fullWidth={false}
                  className="w-auto px-3"
                  loading={subForm.formState.isSubmitting}
                  onClick={() => void submitSubAndNew()}
                >
                  Enregistrer et continuer
                </Button>
              ) : null}
              <Button
                type="submit"
                variant={BUTTON_VARIANT.success}
                fullWidth={false}
                className="w-auto px-4"
                loading={subForm.formState.isSubmitting}
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
        onConfirm={() => void confirmArchive()}
        title={pendingArchive?.type === 'account' ? 'Archiver le compte' : 'Archiver le sous-compte'}
        message={
          pendingArchive
            ? pendingArchive.type === 'account'
              ? `Archiver « ${pendingArchive.label} » et ses sous-comptes ?`
              : `Archiver « ${pendingArchive.label} » ?`
            : ''
        }
        confirmLabel="Archiver"
        confirmVariant={BUTTON_VARIANT.danger}
        busy={archiveBusy}
      />
    </div>
  );
}

function EmptyStateHint() {
  return (
    <p className="rounded-panel border border-dashed border-border-subtle bg-elevated/50 px-4 py-8 text-center text-body text-fg-muted">
      Aucun compte. Crée un groupe (ex. « Comptes perso ») pour y rattacher des sous-comptes.
    </p>
  );
}
