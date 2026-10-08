import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';

import { Button, ChoiceCards, Dialog, FormField, Icon, Select, TpeAmountInput } from '@components';
import { BUTTON_VARIANT, DIALOG_SIZE } from '@constants';
import type { Category, ForecastLine, ForecastStatsPreviousCategory } from '@app-types';
import { cn, formatCents, parseEurosToCents } from '@utils';

import {
  buildCategorySelectOptionsForTone,
  defaultFlowForTone,
  filterCategoriesForTone,
  forecastProgressMetaClass,
  lookupPreviousCategory,
  type BudgetTone,
} from './forecast-budget.utils';
import { ForecastProgressTrack } from './forecast-progress.component';
import { MonthDayPicker } from './month-day-picker.component';

export type ForecastLineFormValues = {
  categoryId: string;
  amount: string;
  flow: 'credit' | 'debit';
  scheduledDay: number | null;
};

export type ForecastLineEditContext = {
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  plannedCents: number;
  actualCents: number;
  remainingCents: number;
  consumptionPercent: number;
  siblingLines: ForecastLine[];
  editingLineId: string;
};

type ForecastLineDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  tone: BudgetTone;
  title: string;
  categories: Category[];
  daysInMonth?: number;
  busy?: boolean;
  initial: ForecastLineFormValues;
  /** Contexte lecture seule — édition uniquement (stats mois + échéances + M−1). */
  editContext?: ForecastLineEditContext | null;
  previousByKey?: Map<string, ForecastStatsPreviousCategory>;
  previousMonthLabel?: string;
  onClose: () => void;
  onSubmit: (values: ForecastLineFormValues) => void | Promise<void>;
  onSubmitAndContinue?: (values: ForecastLineFormValues) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onCreateCategory?: () => void;
};

export function ForecastLineDialog({
  open,
  mode,
  tone,
  title,
  categories,
  daysInMonth,
  busy,
  initial,
  editContext = null,
  previousByKey,
  previousMonthLabel = 'M−1',
  onClose,
  onSubmit,
  onSubmitAndContinue,
  onDelete,
  onCreateCategory,
}: ForecastLineDialogProps) {
  const form = useForm<ForecastLineFormValues>({ defaultValues: initial });
  const isEdit = mode === 'edit';

  useEffect(() => {
    if (open) {
      form.reset(initial);
    }
  }, [open, initial, form]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById('forecast-line-amount')?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, initial]);

  const categoryId = form.watch('categoryId');
  const flow = form.watch('flow');
  const amount = form.watch('amount');
  const selectedCategory = categories.find((item) => item.id === categoryId) ?? null;
  const amountIsExpense =
    selectedCategory?.kind === 'expense' ||
    (selectedCategory?.kind === 'both' && flow === 'debit') ||
    (!selectedCategory && tone === 'expense');
  const amountToneClass = amountIsExpense ? 'text-error' : 'text-success-strong';
  const toneClass = tone === 'income' ? 'text-success-strong' : 'text-error';

  const validateAndSubmit = async (
    values: ForecastLineFormValues,
    handler: (v: ForecastLineFormValues) => void | Promise<void>,
  ) => {
    const cents = parseEurosToCents(values.amount);
    if (cents === null || cents <= 0) {
      form.setError('amount', { message: 'Montant requis' });
      return;
    }
    if (!values.categoryId) {
      form.setError('categoryId', { message: 'Catégorie requise' });
      return;
    }
    await handler(values);
  };

  const handleSubmit = form.handleSubmit(async (values) => validateAndSubmit(values, onSubmit));

  const handleSubmitAndContinue = form.handleSubmit(async (values) => {
    if (!onSubmitAndContinue) return;
    await validateAndSubmit(values, onSubmitAndContinue);
  });

  const categoryOptions = useMemo(
    () => buildCategorySelectOptionsForTone(categories, tone, previousByKey, previousMonthLabel, flow),
    [categories, tone, previousByKey, previousMonthLabel, flow],
  );
  const hasCategories = filterCategoriesForTone(categories, tone).length > 0;

  const previousHint = useMemo(() => {
    if (!isEdit || !categoryId || !previousByKey) return undefined;
    const lookupFlow = selectedCategory?.kind === 'both' ? flow : null;
    return lookupPreviousCategory(previousByKey, categoryId, lookupFlow);
  }, [isEdit, categoryId, flow, previousByKey, selectedCategory?.kind]);

  const previousPlanned = previousHint?.previousPlannedAmountCents ?? 0;
  const previousActual = previousHint?.previousActualAmountCents ?? 0;
  const otherLines =
    isEdit && editContext ? editContext.siblingLines.filter((line) => line.id !== editContext.editingLineId) : [];

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title={title}
      icon="payments"
      size={isEdit ? DIALOG_SIZE.wide : DIALOG_SIZE.large}
    >
      <form className="mt-4 flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        {isEdit && editContext ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="flex items-center gap-3 rounded-control border border-border-subtle bg-subtle/60 p-3">
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
                style={{ backgroundColor: editContext.categoryColor }}
              >
                <Icon name={editContext.categoryIcon} className="text-[1.25rem]!" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold text-fg-primary">{editContext.categoryName}</p>
                <p className="mt-0.5 text-control text-fg-muted">
                  Planifié{' '}
                  <span className="font-semibold text-fg-primary">{formatCents(editContext.plannedCents)}</span>
                  {' · '}
                  Réalisé <span className={cn('font-semibold', toneClass)}>{formatCents(editContext.actualCents)}</span>
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <ForecastProgressTrack
                    percent={editContext.consumptionPercent}
                    remainingCents={editContext.remainingCents}
                    tone={tone}
                    variant="bar"
                  />
                  <span
                    className={cn(
                      'shrink-0 text-[11px] tabular-nums',
                      forecastProgressMetaClass(editContext.consumptionPercent, editContext.remainingCents, tone),
                    )}
                  >
                    {editContext.consumptionPercent}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-2 rounded-control border border-border-subtle bg-subtle/40 px-3 py-3">
              <p className="inline-flex items-center gap-1.5 text-control font-medium text-fg-muted">
                <Icon name="history" className="text-icon-sm" />
                {previousMonthLabel}
              </p>
              {previousHint && (previousActual > 0 || previousPlanned > 0) ? (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-control tabular-nums">
                  <span className="inline-flex items-center gap-1 text-fg-secondary">
                    <Icon name="payments" className="text-[14px]!" />
                    Réalisé <strong className="font-semibold text-fg-primary">{formatCents(previousActual)}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 text-fg-secondary">
                    <Icon name="calendar_month" className="text-[14px]!" />
                    Budget <strong className="font-semibold text-fg-primary">{formatCents(previousPlanned)}</strong>
                  </span>
                </div>
              ) : (
                <p className="text-control text-fg-muted">Aucune donnée le mois précédent.</p>
              )}
            </div>
          </div>
        ) : null}

        {isEdit && otherLines.length > 0 ? (
          <div className="rounded-control border border-border-subtle bg-page/50 px-3 py-2.5 dark:bg-page/20">
            <p className="mb-2 text-[11px] font-medium tracking-wide text-fg-muted uppercase">
              Autres échéances ({otherLines.length})
            </p>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {otherLines.map((line) => (
                <li
                  key={line.id}
                  className="flex items-center justify-between gap-2 rounded-control-sm border border-border-subtle/80 bg-elevated/60 px-2.5 py-1.5 text-control"
                >
                  <span className="inline-flex items-center gap-1.5 text-fg-muted">
                    <Icon name="event" className="text-[14px]!" />
                    {line.scheduledDay !== null ? `Jour ${line.scheduledDay}` : 'Flexible'}
                  </span>
                  <span className={cn('font-semibold tabular-nums', amountToneClass)}>
                    {formatCents(line.plannedAmountCents)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!isEdit ? (
          <FormField label="Catégorie">
            <Select
              label="Catégorie"
              value={categoryId}
              placeholder={hasCategories ? 'Choisir une catégorie' : 'Aucune catégorie'}
              onChange={(next) => form.setValue('categoryId', next, { shouldDirty: true })}
              options={categoryOptions}
              createOption={
                onCreateCategory
                  ? {
                      label: 'Nouvelle catégorie',
                      onCreate: onCreateCategory,
                    }
                  : undefined
              }
            />
          </FormField>
        ) : null}

        {selectedCategory?.kind === 'both' ? (
          <FormField label="Sens">
            <ChoiceCards
              label="Sens"
              className="grid grid-cols-2 gap-2"
              value={flow}
              options={[
                { value: 'debit', label: 'Débit (−)', icon: 'arrow_downward' },
                { value: 'credit', label: 'Crédit (+)', icon: 'arrow_upward' },
              ]}
              onChange={(next) => form.setValue('flow', next, { shouldDirty: true })}
            />
          </FormField>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10.5rem] sm:items-stretch">
          <FormField label="Montant planifié" htmlFor="forecast-line-amount" className="flex h-full flex-col">
            <div className="relative flex min-h-36 flex-1 items-stretch overflow-hidden rounded-control border border-border bg-page focus-within:border-accent focus-within:shadow-[var(--focus-ring)] dark:bg-elevated sm:min-h-[10.5rem]">
              <TpeAmountInput
                id="forecast-line-amount"
                autoFocus={open}
                value={amount}
                onChange={(next) => form.setValue('amount', next, { shouldDirty: true })}
                className={cn(
                  'min-h-36 w-full flex-1 border-0 bg-transparent px-10 py-4 text-center text-[2rem] leading-none font-bold tabular-nums outline-none sm:min-h-[10.5rem] sm:text-[2.25rem]',
                  amountToneClass,
                )}
              />
              <span
                className={cn(
                  'pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[1.75rem] font-semibold tabular-nums',
                  amountToneClass,
                )}
                aria-hidden
              >
                €
              </span>
            </div>
          </FormField>

          <FormField label="Jour (optionnel)" className="flex h-full flex-col">
            <MonthDayPicker
              variant="inline"
              className="flex-1"
              value={form.watch('scheduledDay')}
              daysInMonth={daysInMonth}
              onChange={(scheduledDay) => form.setValue('scheduledDay', scheduledDay, { shouldDirty: true })}
            />
          </FormField>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          {isEdit && onDelete ? (
            <Button
              type="button"
              variant={BUTTON_VARIANT.dangerOutline}
              fullWidth={false}
              className="w-auto px-3"
              loading={busy}
              onClick={() => void onDelete()}
            >
              Supprimer
            </Button>
          ) : null}
          <Button
            type="button"
            variant={BUTTON_VARIANT.dangerOutline}
            fullWidth={false}
            className="w-auto px-3"
            onClick={onClose}
          >
            Annuler
          </Button>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            {!isEdit && onSubmitAndContinue ? (
              <Button
                type="button"
                variant={BUTTON_VARIANT.successOutline}
                fullWidth={false}
                className="w-auto px-3"
                loading={busy}
                onClick={() => void handleSubmitAndContinue()}
              >
                Enregistrer et continuer
              </Button>
            ) : null}
            <Button
              type="submit"
              variant={BUTTON_VARIANT.success}
              fullWidth={false}
              className="w-auto px-4"
              loading={busy}
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

/** Formulaire vierge pour une nouvelle ligne (rien de présélectionné). */
export function emptyLineForm(tone: BudgetTone): ForecastLineFormValues {
  return {
    categoryId: '',
    amount: '',
    flow: defaultFlowForTone(tone),
    scheduledDay: null,
  };
}
