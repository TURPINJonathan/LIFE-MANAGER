import { Button, Icon, IconButton, Select, TpeAmountInput } from '@components';
import { BUTTON_VARIANT, FIELD_CONTROL_CLASSES, ICON_BUTTON_VARIANT } from '@constants';
import type { Category, ForecastStatsPreviousCategory } from '@app-types';
import { cn, formatCents, signedAmountClass } from '@utils';

import { buildCategorySelectOptions } from './category-select-options';
import { MonthDayPicker } from './month-day-picker.component';

export type ForecastDraftLine = {
  key: string;
  categoryId: string;
  amount: string;
  flow: 'credit' | 'debit';
  scheduledDay: number | null;
};

type ForecastEditorProps = {
  isNew: boolean;
  busy: boolean;
  draft: ForecastDraftLine[];
  categories: Category[];
  daysInMonth?: number;
  totals: { incomeCents: number; expenseCents: number; netCents: number };
  previousByKey: Map<string, ForecastStatsPreviousCategory>;
  previousMonthLabel: string;
  orphans: ForecastStatsPreviousCategory[];
  canReset: boolean;
  onCancel: () => void;
  onReset: () => void;
  onSave: () => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onPatch: (key: string, patch: Partial<ForecastDraftLine>) => void;
  onCreateCategory: (key: string) => void;
  onAddOrphan: (orphan: ForecastStatsPreviousCategory) => void;
};

function previousKey(categoryId: string, flow: 'credit' | 'debit' | null | undefined): string {
  return `${categoryId}:${flow ?? ''}`;
}

export function ForecastEditor({
  isNew,
  busy,
  draft,
  categories,
  daysInMonth,
  totals,
  previousByKey,
  previousMonthLabel,
  orphans,
  canReset,
  onCancel,
  onReset,
  onSave,
  onAdd,
  onRemove,
  onPatch,
  onCreateCategory,
  onAddOrphan,
}: ForecastEditorProps) {
  const categoryOptions = buildCategorySelectOptions(categories);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-panel border border-border-subtle bg-elevated">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-border-subtle bg-card/70 px-4 py-3 dark:bg-card/40">
        <div>
          <p className="text-body font-semibold text-fg-primary">{isNew ? 'Nouveau budget' : 'Modifier le budget'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-control tabular-nums">
          <span className="text-success-strong">+{formatCents(totals.incomeCents)}</span>
          <span className="text-error">−{formatCents(totals.expenseCents)}</span>
          <span className={cn('font-semibold', signedAmountClass(totals.netCents))}>
            = {formatCents(totals.netCents)}
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-w-0 sm:min-w-[44rem]">
          <div className="sticky top-0 z-10 hidden grid-cols-[minmax(0,1.2fr)_7rem_9rem_6.75rem_auto] gap-2 border-b border-border-subtle bg-elevated px-4 py-2 text-[11px] font-medium tracking-wide text-fg-muted uppercase sm:grid">
            <span>Catégorie</span>
            <span>Montant</span>
            <span title={previousMonthLabel}>M−1</span>
            <span>Jour</span>
            <span className="sr-only">Actions</span>
          </div>

          <ul className="divide-y divide-border-subtle">
            {draft.map((row) => {
              const category = categories.find((item) => item.id === row.categoryId);
              const flow = category?.kind === 'both' ? row.flow : null;
              const previous =
                previousByKey.get(previousKey(row.categoryId, flow)) ??
                previousByKey.get(previousKey(row.categoryId, null));
              const isCredit =
                category?.kind === 'income' ||
                (category?.kind === 'both' && row.flow === 'credit') ||
                (!category && row.flow === 'credit');
              const amountToneClass = isCredit ? '!text-success-strong' : '!text-error';

              return (
                <li
                  key={row.key}
                  className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1.2fr)_7rem_9rem_6.75rem_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <Select
                      label="Catégorie"
                      value={row.categoryId}
                      placeholder={categories.length === 0 ? 'Aucune catégorie' : 'Choisir une catégorie'}
                      onChange={(categoryId) => onPatch(row.key, { categoryId })}
                      options={categoryOptions}
                      createOption={{
                        label: 'Nouvelle catégorie',
                        onCreate: () => onCreateCategory(row.key),
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="relative">
                      <TpeAmountInput
                        className={cn(FIELD_CONTROL_CLASSES, 'pe-7 font-semibold tabular-nums', amountToneClass)}
                        value={row.amount}
                        aria-label="Montant en euros"
                        onChange={(amount) => onPatch(row.key, { amount })}
                      />
                      <span
                        className={cn(
                          'pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-control',
                          amountToneClass,
                        )}
                      >
                        €
                      </span>
                    </div>
                  </div>

                  <div
                    className="text-[11px] leading-snug tabular-nums text-fg-muted"
                    title={previousMonthLabel}
                    aria-label={`${previousMonthLabel} — réalisé ${formatCents(previous?.previousActualAmountCents ?? 0)}, planifié ${formatCents(previous?.previousPlannedAmountCents ?? 0)}`}
                  >
                    <p>réalisé {formatCents(previous?.previousActualAmountCents ?? 0)}</p>
                    <p>planifié {formatCents(previous?.previousPlannedAmountCents ?? 0)}</p>
                  </div>

                  <MonthDayPicker
                    value={row.scheduledDay}
                    daysInMonth={daysInMonth}
                    onChange={(scheduledDay) => onPatch(row.key, { scheduledDay })}
                    className="w-full justify-center"
                  />

                  <div className="flex items-center justify-end gap-0.5">
                    {category?.kind === 'both' && (
                      <IconButton
                        variant={ICON_BUTTON_VARIANT.ghost}
                        icon={row.flow === 'credit' ? 'arrow_upward' : 'arrow_downward'}
                        aria-label={
                          row.flow === 'credit' ? 'Entrée — basculer en sortie' : 'Sortie — basculer en entrée'
                        }
                        onClick={() => onPatch(row.key, { flow: row.flow === 'credit' ? 'debit' : 'credit' })}
                      />
                    )}
                    <IconButton
                      variant={ICON_BUTTON_VARIANT.ghost}
                      icon="delete"
                      aria-label="Retirer la ligne"
                      disabled={draft.length <= 1}
                      onClick={() => onRemove(row.key)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {orphans.length > 0 ? (
            <div className="border-t border-border-subtle bg-subtle/40 px-4 py-3">
              <p className="text-[11px] font-medium tracking-wide text-fg-muted uppercase">
                Présent en {previousMonthLabel} — indicatif
              </p>
              <ul className="mt-2 flex flex-col gap-2">
                {orphans.map((orphan) => (
                  <li
                    key={previousKey(orphan.categoryId, orphan.flow)}
                    className="flex items-center justify-between gap-3 rounded-control border border-dashed border-border-subtle px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-control italic text-fg-muted">{orphan.categoryName}</p>
                      <p className="text-[11px] tabular-nums text-fg-muted">
                        réalisé {formatCents(orphan.previousActualAmountCents)}
                        {orphan.previousPlannedAmountCents > 0
                          ? ` · planifié ${formatCents(orphan.previousPlannedAmountCents)}`
                          : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAddOrphan(orphan)}
                      className="shrink-0 cursor-pointer text-control font-medium text-accent hover:underline"
                    >
                      Ajouter
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border-subtle bg-elevated px-4 py-3">
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex cursor-pointer items-center gap-1.5 text-control font-medium text-accent hover:underline"
        >
          <Icon name="add" className="text-[1.1rem]!" />
          Ajouter une ligne
        </button>
        <div className="ms-auto flex flex-wrap gap-2">
          <Button
            type="button"
            variant={BUTTON_VARIANT.dangerOutline}
            fullWidth={false}
            className="w-auto px-3"
            onClick={onCancel}
          >
            Annuler
          </Button>
          {canReset ? (
            <Button
              type="button"
              variant={BUTTON_VARIANT.neutral}
              fullWidth={false}
              className="w-auto px-3"
              onClick={onReset}
            >
              Réinitialiser
            </Button>
          ) : null}
          <Button
            type="button"
            fullWidth={false}
            className="w-auto px-4"
            variant={BUTTON_VARIANT.success}
            loading={busy}
            onClick={onSave}
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </section>
  );
}
