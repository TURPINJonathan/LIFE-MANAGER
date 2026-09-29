import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, ConfirmDialog, EmptyState, Icon, IconButton, Tooltip, Typography } from '@components';
import { BUTTON_VARIANT, ICON_BUTTON_VARIANT, currentYearMonth, shiftYearMonth } from '@constants';
import { CategoryQuickCreate } from '@categories';
import {
  ApiError,
  createForecast,
  deleteForecast,
  duplicateForecast,
  fetchForecast,
  fetchForecastStats,
  updateForecast,
} from '@services';
import { useAuthStore } from '@store';
import type {
  Category,
  CategoryKind,
  ForecastLineInput,
  ForecastStats,
  ForecastStatsCategory,
  ForecastStatsPreviousCategory,
  MonthlyForecast,
} from '@app-types';
import {
  centsToInput,
  cn,
  formatCents,
  parseEurosToCents,
  signedAmountClass,
  toastFromError,
  toastSuccess,
} from '@utils';

import { BalanceTimelineChart } from './balance-timeline-chart.component';
import { defaultCategoryId } from './category-select-options';
import { ForecastEditor, type ForecastDraftLine } from './forecast-editor.component';
import { formatMonthLabel } from './forecast.utils';

type DraftLine = ForecastDraftLine;

type ForecastPanelProps = {
  subAccountId: string;
  categories: Category[];
  onCategoryCreated?: (category: Category) => void;
  onChromeActionsChange?: (actions: ForecastChromeActions | null) => void;
  yearMonth?: string;
  onYearMonthChange?: (yearMonth: string) => void;
};

export type ForecastChromeActions = {
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
};

type AggregatedStatsCategory = {
  key: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  categoryKind: CategoryKind;
  flow: 'credit' | 'debit' | null;
  scheduledDays: number[];
  plannedAmountCents: number;
  plannedSignedCents: number;
  actualAmountCents: number;
  actualSignedCents: number;
  remainingCents: number;
  consumptionPercent: number;
  overBudget: boolean;
  lineCount: number;
};

function aggregateStatsCategories(rows: ForecastStatsCategory[]): AggregatedStatsCategory[] {
  const map = new Map<string, AggregatedStatsCategory>();

  for (const row of rows) {
    const key = `${row.categoryId}:${row.flow ?? 'auto'}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        categoryIcon: row.categoryIcon,
        categoryColor: row.categoryColor,
        categoryKind: row.categoryKind,
        flow: row.flow,
        scheduledDays: row.scheduledDay !== null ? [row.scheduledDay] : [],
        plannedAmountCents: row.plannedAmountCents,
        plannedSignedCents: row.plannedSignedCents,
        actualAmountCents: row.actualAmountCents,
        actualSignedCents: row.actualSignedCents,
        remainingCents: row.remainingCents,
        consumptionPercent: 0,
        overBudget: false,
        lineCount: 1,
      });
      continue;
    }

    existing.plannedAmountCents += row.plannedAmountCents;
    existing.plannedSignedCents += row.plannedSignedCents;
    existing.actualAmountCents += row.actualAmountCents;
    existing.actualSignedCents += row.actualSignedCents;
    existing.remainingCents += row.remainingCents;
    existing.lineCount += 1;
    if (row.scheduledDay !== null && !existing.scheduledDays.includes(row.scheduledDay)) {
      existing.scheduledDays.push(row.scheduledDay);
    }
  }

  return [...map.values()]
    .map((row) => {
      const consumptionPercent =
        row.plannedAmountCents > 0
          ? Math.round((row.actualAmountCents / row.plannedAmountCents) * 100)
          : row.actualAmountCents > 0
            ? 100
            : 0;
      const isExpense = isExpenseStatsRow(row);
      return {
        ...row,
        scheduledDays: [...row.scheduledDays].sort((a, b) => a - b),
        consumptionPercent,
        overBudget: isExpense && row.actualAmountCents > row.plannedAmountCents,
      };
    })
    .sort((a, b) => {
      const aExpense = isExpenseStatsRow(a);
      const bExpense = isExpenseStatsRow(b);
      if (aExpense !== bExpense) {
        return aExpense ? -1 : 1;
      }
      return b.consumptionPercent - a.consumptionPercent || a.categoryName.localeCompare(b.categoryName, 'fr');
    });
}

function isExpenseStatsRow(
  row: Pick<AggregatedStatsCategory, 'plannedSignedCents' | 'categoryKind' | 'flow'>,
): boolean {
  if (row.plannedSignedCents < 0) return true;
  if (row.plannedSignedCents > 0) return false;
  if (row.categoryKind === 'expense') return true;
  if (row.categoryKind === 'income') return false;
  return row.flow === 'debit';
}

function previousMonthKey(categoryId: string, flow: 'credit' | 'debit' | null | undefined): string {
  return `${categoryId}:${flow ?? ''}`;
}

export function ForecastPanel({
  subAccountId,
  categories,
  onCategoryCreated,
  onChromeActionsChange,
  yearMonth: yearMonthProp,
  onYearMonthChange,
}: ForecastPanelProps) {
  const token = useAuthStore((state) => state.token);
  const [internalYearMonth, setInternalYearMonth] = useState(currentYearMonth);
  const yearMonth = yearMonthProp ?? internalYearMonth;
  const setYearMonth = (value: string | ((prev: string) => string)) => {
    const next = typeof value === 'function' ? value(yearMonth) : value;
    if (onYearMonthChange) {
      onYearMonthChange(next);
      return;
    }
    setInternalYearMonth(next);
  };
  const [forecast, setForecast] = useState<MonthlyForecast | null>(null);
  const [stats, setStats] = useState<ForecastStats | null>(null);
  const [draft, setDraft] = useState<DraftLine[]>([]);
  const [draftBaseline, setDraftBaseline] = useState<DraftLine[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [categoryCreateForKey, setCategoryCreateForKey] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const reload = async (month = yearMonth) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Stats d’abord : sync API peut créer le budget + lignes manquantes (0 €).
      const st = await fetchForecastStats(token, subAccountId, month);
      const fc = st.hasForecast ? await fetchForecast(token, subAccountId, month) : null;
      setForecast(fc);
      setStats(st);
      setEditing(false);
      setDraft([]);
      setDraftBaseline([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload(yearMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, subAccountId, yearMonth]);

  const startCreate = () => {
    const initial: DraftLine[] = [
      {
        key: crypto.randomUUID(),
        categoryId: defaultCategoryId(categories),
        amount: '',
        flow: 'debit',
        scheduledDay: null,
      },
    ];
    setDraft(initial);
    setDraftBaseline(initial.map((row) => ({ ...row })));
    setEditing(true);
  };

  const startEdit = useCallback(() => {
    if (!forecast) return;
    const initial = forecast.lines.map((line) => ({
      key: line.id,
      categoryId: line.categoryId,
      amount: centsToInput(line.plannedAmountCents),
      flow: line.flow ?? 'debit',
      scheduledDay: line.scheduledDay ?? null,
    }));
    setDraft(initial);
    setDraftBaseline(initial.map((row) => ({ ...row })));
    setEditing(true);
  }, [forecast]);

  const toInputs = (): ForecastLineInput[] | null => {
    const lines: ForecastLineInput[] = [];
    for (const row of draft) {
      if (!row.categoryId) {
        setError('Chaque ligne doit avoir une catégorie.');
        return null;
      }
      const cents = parseEurosToCents(row.amount);
      if (cents === null || cents < 0) {
        setError('Montants invalides.');
        return null;
      }
      const category = categories.find((item) => item.id === row.categoryId);
      lines.push({
        categoryId: row.categoryId,
        plannedAmountCents: cents,
        flow: category?.kind === 'both' ? row.flow : null,
        scheduledDay: row.scheduledDay,
      });
    }
    return lines;
  };

  const save = async () => {
    if (!token) return;
    const lines = toInputs();
    if (!lines) return;
    setBusy(true);
    setError(null);
    try {
      if (forecast) {
        await updateForecast(token, forecast.id, { lines });
      } else {
        await createForecast(token, subAccountId, { yearMonth, lines });
      }
      toastSuccess('Budget enregistré.');
      await reload();
    } catch (err) {
      toastFromError(err, 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  };

  const onDuplicate = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await duplicateForecast(token, subAccountId, {
        sourceYearMonth: shiftYearMonth(yearMonth, -1),
        targetYearMonth: yearMonth,
      });
      toastSuccess('Budget dupliqué.');
      await reload();
    } catch (err) {
      toastFromError(err, 'Duplication impossible.');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!token || !forecast) return;
    setBusy(true);
    try {
      await deleteForecast(token, forecast.id);
      toastSuccess('Budget supprimé.');
      setDeleteOpen(false);
      await reload();
    } catch (err) {
      toastFromError(err, 'Suppression impossible.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!onChromeActionsChange) return;
    if (!forecast || editing) {
      onChromeActionsChange(null);
      return;
    }
    onChromeActionsChange({
      onEdit: startEdit,
      onDelete: () => setDeleteOpen(true),
      busy,
    });
    return () => onChromeActionsChange(null);
  }, [onChromeActionsChange, forecast, editing, busy, startEdit]);

  const prevMonthLabel = useMemo(() => formatMonthLabel(shiftYearMonth(yearMonth, -1)), [yearMonth]);
  const aggregatedCategories = useMemo(() => aggregateStatsCategories(stats?.categories ?? []), [stats?.categories]);
  const previousByKey = useMemo(() => {
    const map = new Map<string, ForecastStatsPreviousCategory>();
    for (const row of stats?.previousMonth?.categories ?? []) {
      map.set(previousMonthKey(row.categoryId, row.flow), row);
      // Fallback sans flow (catégories expense/income).
      if (!row.flow) {
        map.set(previousMonthKey(row.categoryId, null), row);
      }
    }
    return map;
  }, [stats?.previousMonth?.categories]);
  const incomeCategories = useMemo(
    () => aggregatedCategories.filter((row) => !isExpenseStatsRow(row)),
    [aggregatedCategories],
  );
  const expenseCategories = useMemo(
    () => aggregatedCategories.filter((row) => isExpenseStatsRow(row)),
    [aggregatedCategories],
  );
  const incomeOrphans = useMemo(
    () => (stats?.previousMonth?.orphans ?? []).filter((row) => !row.isExpense),
    [stats?.previousMonth?.orphans],
  );
  const expenseOrphans = useMemo(
    () => (stats?.previousMonth?.orphans ?? []).filter((row) => row.isExpense),
    [stats?.previousMonth?.orphans],
  );
  const draftCategoryKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of draft) {
      const category = categories.find((item) => item.id === row.categoryId);
      const flow = category?.kind === 'both' ? row.flow : null;
      keys.add(previousMonthKey(row.categoryId, flow));
    }
    return keys;
  }, [draft, categories]);
  const editorOrphans = useMemo(
    () =>
      (stats?.previousMonth?.orphans ?? []).filter(
        (row) => !draftCategoryKeys.has(previousMonthKey(row.categoryId, row.flow)),
      ),
    [stats?.previousMonth?.orphans, draftCategoryKeys],
  );

  const draftTotals = useMemo(() => {
    let incomeCents = 0;
    let expenseCents = 0;
    for (const row of draft) {
      const cents = parseEurosToCents(row.amount);
      if (cents === null || cents < 0) continue;
      const category = categories.find((item) => item.id === row.categoryId);
      const isCredit = category?.kind === 'income' || (category?.kind === 'both' && row.flow === 'credit');
      if (isCredit) incomeCents += cents;
      else expenseCents += cents;
    }
    return { incomeCents, expenseCents, netCents: incomeCents - expenseCents, count: draft.length };
  }, [categories, draft]);

  const patchDraft = (key: string, patch: Partial<DraftLine>) => {
    setDraft((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const addDraftLine = () => {
    setDraft((rows) => [
      ...rows,
      {
        key: crypto.randomUUID(),
        categoryId: defaultCategoryId(categories),
        amount: '',
        flow: 'debit',
        scheduledDay: null,
      },
    ]);
  };

  const addOrphanFromPrevious = (orphan: ForecastStatsPreviousCategory) => {
    const seedCents =
      orphan.previousPlannedAmountCents > 0 ? orphan.previousPlannedAmountCents : orphan.previousActualAmountCents;
    const orphanLine: DraftLine = {
      key: crypto.randomUUID(),
      categoryId: orphan.categoryId,
      amount: centsToInput(seedCents),
      flow: orphan.flow ?? (orphan.isExpense ? 'debit' : 'credit'),
      scheduledDay: null,
    };

    if (editing) {
      setDraft((rows) => [...rows, orphanLine]);
      return;
    }

    const base: DraftLine[] = forecast
      ? forecast.lines.map((line) => ({
          key: line.id,
          categoryId: line.categoryId,
          amount: centsToInput(line.plannedAmountCents),
          flow: line.flow ?? 'debit',
          scheduledDay: line.scheduledDay ?? null,
        }))
      : [];
    const next = [...base, orphanLine];
    setDraft(next);
    setDraftBaseline(base.map((row) => ({ ...row })));
    setEditing(true);
  };

  const draftDirty = useMemo(() => {
    if (draft.length !== draftBaseline.length) return true;
    return draft.some((row, index) => {
      const baseline = draftBaseline[index];
      return (
        !baseline ||
        row.key !== baseline.key ||
        row.categoryId !== baseline.categoryId ||
        row.amount !== baseline.amount ||
        row.flow !== baseline.flow ||
        row.scheduledDay !== baseline.scheduledDay
      );
    });
  }, [draft, draftBaseline]);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <IconButton
            variant={ICON_BUTTON_VARIANT.ghost}
            icon="chevron_left"
            aria-label="Mois précédent"
            onClick={() => setYearMonth((value) => shiftYearMonth(value, -1))}
          />
          <Typography variant="title" className="min-w-[10rem] text-center">
            {formatMonthLabel(yearMonth)}
          </Typography>
          <IconButton
            variant={ICON_BUTTON_VARIANT.ghost}
            icon="chevron_right"
            aria-label="Mois suivant"
            onClick={() => setYearMonth((value) => shiftYearMonth(value, 1))}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void onDelete()}
        title="Supprimer le budget"
        message={`Supprimer le budget de ${formatMonthLabel(yearMonth)} ? Cette action est définitive.`}
        confirmLabel="Supprimer"
        confirmVariant={BUTTON_VARIANT.danger}
        busy={busy}
      />

      {error && (
        <p className="text-control text-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-body text-fg-muted">Chargement…</p>
      ) : editing ? (
        <ForecastEditor
          isNew={!forecast}
          busy={busy}
          draft={draft}
          categories={categories}
          daysInMonth={stats?.meta.daysInMonth}
          totals={draftTotals}
          previousByKey={previousByKey}
          previousMonthLabel={prevMonthLabel}
          orphans={editorOrphans}
          canReset={draftDirty}
          onCancel={() => {
            setEditing(false);
            setDraft([]);
            setDraftBaseline([]);
            setError(null);
          }}
          onReset={() => setDraft(draftBaseline.map((row) => ({ ...row })))}
          onSave={() => void save()}
          onAdd={addDraftLine}
          onRemove={(key) => setDraft((rows) => rows.filter((item) => item.key !== key))}
          onPatch={patchDraft}
          onCreateCategory={setCategoryCreateForKey}
          onAddOrphan={addOrphanFromPrevious}
        />
      ) : !forecast ? (
        <EmptyState
          icon="calendar_month"
          title={`Aucun budget pour ${formatMonthLabel(yearMonth)}`}
          message="Planifie revenus et dépenses, ou reprends le mois précédent en un clic."
          action={
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant={BUTTON_VARIANT.success}
                fullWidth={false}
                className="w-auto px-4"
                loading={busy}
                onClick={() => void onDuplicate()}
              >
                Dupliquer {prevMonthLabel}
              </Button>
              <Button
                type="button"
                variant={BUTTON_VARIANT.secondary}
                fullWidth={false}
                className="w-auto px-4"
                onClick={startCreate}
              >
                Créer un budget vide
              </Button>
            </div>
          }
        />
      ) : (
        <>
          {stats && (
            <div className="grid gap-3 lg:grid-cols-2 lg:items-stretch">
              <div className="grid h-full min-h-64 grid-cols-2 gap-3 sm:grid-cols-3 sm:grid-rows-2">
                <StatCard
                  label="Début de mois"
                  hint="Solde au 1er du mois"
                  icon="event"
                  tone="muted"
                  value={stats.balances.openingCents}
                />
                <StatCard
                  label="Projeté budget"
                  hint="Si tout le plan est tenu"
                  icon="calendar_month"
                  tone="accent"
                  value={stats.balances.projectedBudgetCents}
                />
                <StatCard
                  label="Projeté réaliste"
                  hint="Réalisé + reste planifié"
                  icon="trending_up"
                  tone="accent"
                  value={stats.balances.projectedRealisticCents}
                />
                <StatCard
                  label="Solde actuel"
                  hint="À ce jour, hors en attente"
                  icon="account_balance_wallet"
                  tone="brand"
                  value={stats.balances.currentCents}
                />
                <StatCard
                  label="Fin de mois"
                  hint="Réalisé depuis le 1er"
                  icon="flag"
                  tone="success"
                  value={stats.balances.endOfMonthActualCents}
                />
                <StatCard
                  label="Écart"
                  hint="Budget − réalisé (net)"
                  icon="compare_arrows"
                  tone="variance"
                  value={stats.balances.varianceBudgetVsActualNetCents}
                />
              </div>
              {stats.timeline.length > 0 ? (
                <BalanceTimelineChart
                  points={stats.timeline}
                  daysElapsed={stats.meta.daysElapsed}
                  className="min-h-64 lg:h-full"
                />
              ) : (
                <div className="flex min-h-64 items-center justify-center rounded-panel border border-dashed border-border-subtle bg-elevated px-4 text-control text-fg-muted lg:h-full">
                  Timeline indisponible pour ce mois.
                </div>
              )}
            </div>
          )}

          {stats && (
            <div className="grid gap-4 lg:grid-cols-2">
              <ForecastCategoryColumn
                title="Revenus"
                icon="arrow_upward"
                plannedCents={stats.totals.plannedIncomeCents}
                actualCents={stats.totals.actualIncomeCents}
                previousPlannedCents={stats.previousMonth?.totals.plannedIncomeCents ?? 0}
                previousActualCents={stats.previousMonth?.totals.actualIncomeCents ?? 0}
                previousMonthLabel={prevMonthLabel}
                tone="income"
                rows={incomeCategories}
                orphans={incomeOrphans}
                previousByKey={previousByKey}
                emptyLabel="Aucun revenu planifié ce mois."
                onAddOrphan={addOrphanFromPrevious}
              />
              <ForecastCategoryColumn
                title="Dépenses"
                icon="arrow_downward"
                plannedCents={stats.totals.plannedExpenseCents}
                actualCents={stats.totals.actualExpenseCents}
                previousPlannedCents={stats.previousMonth?.totals.plannedExpenseCents ?? 0}
                previousActualCents={stats.previousMonth?.totals.actualExpenseCents ?? 0}
                previousMonthLabel={prevMonthLabel}
                tone="expense"
                rows={expenseCategories}
                orphans={expenseOrphans}
                previousByKey={previousByKey}
                emptyLabel="Aucune dépense planifiée ce mois."
                onAddOrphan={addOrphanFromPrevious}
              />
            </div>
          )}

          {stats && stats.unbudgeted.items.length > 0 && (
            <div className="rounded-panel border border-border-subtle bg-elevated p-4">
              <p className="text-control font-medium text-fg-secondary">Hors budget</p>
              <ul className="mt-2 space-y-1">
                {stats.unbudgeted.items.map((item) => (
                  <li key={item.categoryId} className="flex justify-between text-body">
                    <span>{item.categoryName ?? 'Catégorie'}</span>
                    <span className={signedAmountClass(item.actualSignedCents)}>
                      {formatCents(item.actualSignedCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {stats && (
            <p className="text-control text-fg-muted">
              Jour {stats.meta.daysElapsed}/{stats.meta.daysInMonth}
              {stats.meta.daysRemaining > 0 ? ` · ${stats.meta.daysRemaining} restant(s)` : ''}
            </p>
          )}
        </>
      )}

      <CategoryQuickCreate
        open={categoryCreateForKey !== null}
        onClose={() => setCategoryCreateForKey(null)}
        onCreated={(category) => {
          onCategoryCreated?.(category);
          if (categoryCreateForKey) {
            setDraft((rows) =>
              rows.map((row) => (row.key === categoryCreateForKey ? { ...row, categoryId: category.id } : row)),
            );
          }
          setCategoryCreateForKey(null);
        }}
      />
    </div>
  );
}

function StatCard({
  label,
  hint,
  icon,
  value,
  tone,
}: {
  label: string;
  hint: string;
  icon: string;
  value: number;
  tone: 'muted' | 'brand' | 'accent' | 'success' | 'variance';
}) {
  const negative = value < 0;
  const surface =
    tone === 'variance'
      ? negative
        ? 'border-error/25 bg-error/8'
        : 'border-success/25 bg-success/8'
      : tone === 'accent'
        ? 'border-accent/25 bg-accent-tint/80'
        : tone === 'success'
          ? 'border-success/25 bg-success/8'
          : tone === 'brand'
            ? 'border-brand/30 bg-brand/10'
            : 'border-border bg-subtle/90';

  const watermarkTone =
    tone === 'variance'
      ? negative
        ? 'text-error'
        : 'text-success-strong'
      : tone === 'accent'
        ? 'text-accent-press'
        : tone === 'success'
          ? 'text-success-strong'
          : tone === 'brand'
            ? 'text-brand'
            : 'text-fg-secondary';

  return (
    <article
      className={cn(
        'relative flex h-full min-h-[6.5rem] flex-col overflow-hidden rounded-panel border p-3 shadow-sm sm:min-h-0 sm:p-4',
        surface,
      )}
    >
      <Icon
        name={icon}
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-1/2 -right-8 -translate-y-1/2 text-[9rem]! leading-none opacity-[0.12] sm:-right-10 sm:text-[10.5rem]!',
          watermarkTone,
        )}
      />

      <div className="relative z-10 min-w-0">
        <p className="truncate text-control font-semibold text-fg-primary">{label}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-fg-muted">{hint}</p>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-1 py-2">
        <p
          className={cn(
            'text-center text-[1.65rem] font-bold leading-none tracking-tight tabular-nums sm:text-[1.85rem]',
            signedAmountClass(value),
          )}
        >
          {formatCents(value)}
        </p>
      </div>
    </article>
  );
}

function ForecastCategoryColumn({
  title,
  icon,
  plannedCents,
  actualCents,
  previousPlannedCents,
  previousActualCents,
  previousMonthLabel,
  tone,
  rows,
  orphans,
  previousByKey,
  emptyLabel,
  onAddOrphan,
}: {
  title: string;
  icon: string;
  plannedCents: number;
  actualCents: number;
  previousPlannedCents: number;
  previousActualCents: number;
  previousMonthLabel: string;
  tone: 'income' | 'expense';
  rows: AggregatedStatsCategory[];
  orphans: ForecastStatsPreviousCategory[];
  previousByKey: Map<string, ForecastStatsPreviousCategory>;
  emptyLabel: string;
  onAddOrphan: (orphan: ForecastStatsPreviousCategory) => void;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-panel border border-border-subtle bg-elevated p-3 shadow-sm sm:p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Icon
              name={icon}
              className={cn('text-icon-sm', tone === 'income' ? 'text-success-strong' : 'text-error')}
            />
            <h3 className="text-body font-semibold text-fg-primary">{title}</h3>
          </div>
          <p className="mt-1 text-control text-fg-muted">
            Planifié {formatCents(plannedCents)} · Réalisé{' '}
            <span className={tone === 'income' ? 'text-success-strong' : 'text-error'}>{formatCents(actualCents)}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Tooltip
            content={`${previousMonthLabel} — planifié ${formatCents(previousPlannedCents)} · réalisé ${formatCents(previousActualCents)}`}
          >
            <span
              className="inline-flex cursor-help text-fg-muted"
              aria-label={`Mois précédent : ${previousMonthLabel}`}
            >
              <Icon name="history" className="text-icon-sm" />
            </span>
          </Tooltip>
          <span className="rounded-full bg-subtle px-2 py-0.5 text-control text-fg-muted">{rows.length}</span>
        </div>
      </header>

      {rows.length === 0 && orphans.length === 0 ? (
        <p className="rounded-control border border-dashed border-border-subtle px-3 py-4 text-center text-control text-fg-muted">
          {emptyLabel}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.map((row) => (
            <ForecastCategoryRow
              key={row.key}
              row={row}
              tone={tone}
              previous={
                previousByKey.get(previousMonthKey(row.categoryId, row.flow)) ??
                previousByKey.get(previousMonthKey(row.categoryId, null))
              }
              previousMonthLabel={previousMonthLabel}
            />
          ))}
          {orphans.map((orphan) => (
            <ForecastOrphanRow
              key={`orphan-${previousMonthKey(orphan.categoryId, orphan.flow)}`}
              orphan={orphan}
              previousMonthLabel={previousMonthLabel}
              onAdd={() => onAddOrphan(orphan)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ForecastCategoryRow({
  row,
  tone,
  previous,
  previousMonthLabel,
}: {
  row: AggregatedStatsCategory;
  tone: 'income' | 'expense';
  previous?: ForecastStatsPreviousCategory;
  previousMonthLabel: string;
}) {
  const remainingLabel =
    row.remainingCents >= 0
      ? `Reste ${formatCents(row.remainingCents)}`
      : `+${formatCents(Math.abs(row.remainingCents))}`;
  const daysLabel = row.scheduledDays.length > 0 ? ` · j.${row.scheduledDays.join(', ')}` : '';

  return (
    <li className="rounded-control border border-border-subtle bg-page/70 px-2.5 py-2 dark:bg-page/20">
      <div className="flex items-center gap-2">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: row.categoryColor }}
        >
          <Icon name={row.categoryIcon} className="text-[13px]!" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="min-w-0 truncate text-control font-semibold text-fg-primary">
              {row.categoryName}
              <span className="font-normal text-fg-muted">{daysLabel}</span>
            </p>
            <div className="flex shrink-0 items-center gap-1.5 text-control tabular-nums text-fg-muted">
              <p>
                <span className={cn('font-semibold', tone === 'income' ? 'text-success-strong' : 'text-error')}>
                  {formatCents(Math.abs(row.actualSignedCents))}
                </span>
                <span className="text-fg-muted"> / {formatCents(row.plannedAmountCents)}</span>
              </p>
              <Tooltip
                content={`${previousMonthLabel} — réalisé ${formatCents(previous?.previousActualAmountCents ?? 0)} · planifié ${formatCents(previous?.previousPlannedAmountCents ?? 0)}`}
              >
                <span
                  className="inline-flex cursor-help text-fg-muted"
                  aria-label={`Mois précédent : ${previousMonthLabel}`}
                >
                  <Icon name="history" className="text-[14px]!" />
                </span>
              </Tooltip>
            </div>
          </div>

          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-subtle">
              <div
                className={cn(
                  'h-full rounded-full',
                  row.overBudget ? 'bg-error' : tone === 'income' ? 'bg-success-strong' : 'bg-accent',
                )}
                style={{ width: `${Math.min(100, row.consumptionPercent)}%` }}
              />
            </div>
            <p
              className={cn(
                'shrink-0 text-[11px] tabular-nums',
                row.overBudget ? 'font-medium text-error' : 'text-fg-muted',
              )}
            >
              {row.consumptionPercent}% · {remainingLabel}
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}

function ForecastOrphanRow({
  orphan,
  previousMonthLabel,
  onAdd,
}: {
  orphan: ForecastStatsPreviousCategory;
  previousMonthLabel: string;
  onAdd: () => void;
}) {
  return (
    <li className="rounded-control border border-dashed border-border-subtle bg-transparent px-2.5 py-2 opacity-75">
      <div className="flex items-center gap-2">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-white/90 grayscale"
          style={{ backgroundColor: orphan.categoryColor }}
        >
          <Icon name={orphan.categoryIcon} className="text-[13px]!" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="min-w-0 truncate text-control italic text-fg-muted">
              {orphan.categoryName}
              <span className="not-italic"> · indicatif {previousMonthLabel}</span>
            </p>
            <p className="shrink-0 text-[11px] tabular-nums text-fg-muted">
              réalisé {formatCents(orphan.previousActualAmountCents)}
              {orphan.previousPlannedAmountCents > 0
                ? ` / planifié ${formatCents(orphan.previousPlannedAmountCents)}`
                : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="mt-1 cursor-pointer text-[11px] font-medium text-accent hover:underline"
          >
            Ajouter au budget
          </button>
        </div>
      </div>
    </li>
  );
}
