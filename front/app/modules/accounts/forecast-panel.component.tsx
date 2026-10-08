import { useEffect, useEffectEvent, useMemo, useState } from 'react';

import { Button, ConfirmDialog, Dialog, Icon, Tooltip } from '@components';
import { BUTTON_VARIANT, DIALOG_SIZE, currentYearMonth, shiftYearMonth } from '@constants';
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
  ForecastLineInput,
  ForecastStats,
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
import {
  forecastLineToInput,
  forecastProgressMetaClass,
  forecastProgressPercentBadgeClass,
  forecastProgressPercentBadgeLabel,
  forecastProgressRemainingLabel,
  forecastProgressRowSurfaceClass,
  forecastToLineInputs,
  isExpenseStatsRow,
  linesForCategoryGroup,
  previousMonthKey,
  type BudgetTone,
} from './forecast-budget.utils';
import { ForecastCategoryDialog } from './forecast-category-dialog.component';
import { ForecastCategoryOperationsDialog } from './forecast-category-operations-dialog.component';
import { ForecastEditor, type ForecastDraftLine } from './forecast-editor.component';
import {
  emptyLineForm,
  ForecastLineDialog,
  type ForecastLineEditContext,
  type ForecastLineFormValues,
} from './forecast-line-dialog.component';
import { ForecastProgressTrack } from './forecast-progress.component';
import {
  aggregateStatsCategories,
  formatMonthLabel,
  toCategoryBars,
  type AggregatedStatsCategory,
} from './forecast.utils';

type DraftLine = ForecastDraftLine;

type LineDialogState =
  | null
  | { mode: 'create'; tone: BudgetTone; seed?: Partial<ForecastLineFormValues> }
  | { mode: 'edit'; lineId: string };

type ForecastPanelProps = {
  subAccountId: string;
  categories: Category[];
  onCategoryCreated?: (category: Category) => void;
  onChromeActionsChange?: (actions: ForecastChromeActions | null) => void;
  yearMonth?: string;
  onYearMonthChange?: (yearMonth: string) => void;
  /** Ouvre cette ligne de budget une fois le mois chargé, puis le signale. */
  focusLineId?: string | null;
  onFocusLineHandled?: () => void;
};

export type ForecastChromeActions = {
  busy: boolean;
  monthLabel: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenSpreadsheet: () => void;
  canDelete: boolean;
  onDelete: () => void;
  canDuplicate: boolean;
  onDuplicate: () => void;
  previousMonthLabel: string;
};

export function ForecastPanel({
  subAccountId,
  categories,
  onCategoryCreated,
  onChromeActionsChange,
  yearMonth: yearMonthProp,
  onYearMonthChange,
  focusLineId,
  onFocusLineHandled,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [categoryCreateOpen, setCategoryCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lineDialog, setLineDialog] = useState<LineDialogState>(null);
  const [categoryDialogRow, setCategoryDialogRow] = useState<AggregatedStatsCategory | null>(null);
  const [operationsDialogRow, setOperationsDialogRow] = useState<AggregatedStatsCategory | null>(null);
  const [spreadsheetOpen, setSpreadsheetOpen] = useState(false);
  const [spreadsheetDraft, setSpreadsheetDraft] = useState<DraftLine[]>([]);
  const [spreadsheetBaseline, setSpreadsheetBaseline] = useState<DraftLine[]>([]);

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

  const handleFocusLine = useEffectEvent(() => {
    onFocusLineHandled?.();
  });

  useEffect(() => {
    if (!focusLineId || loading) return;
    if (forecast && forecast.yearMonth !== yearMonth) return;
    const line = forecast?.lines.find((item) => item.id === focusLineId);
    if (line) setLineDialog({ mode: 'edit', lineId: line.id });
    handleFocusLine();
  }, [focusLineId, loading, forecast, yearMonth]);

  const formValuesToInput = (values: ForecastLineFormValues): ForecastLineInput | null => {
    const cents = parseEurosToCents(values.amount);
    if (cents === null || cents <= 0 || !values.categoryId) {
      return null;
    }
    const category = categories.find((item) => item.id === values.categoryId);
    return {
      categoryId: values.categoryId,
      plannedAmountCents: cents,
      flow: category?.kind === 'both' ? values.flow : null,
      scheduledDay: values.scheduledDay,
    };
  };

  const persistLines = async (lines: ForecastLineInput[]) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      if (lines.length === 0 && forecast) {
        await deleteForecast(token, forecast.id);
        toastSuccess('Budget supprimé.');
      } else if (forecast) {
        await updateForecast(token, forecast.id, { lines });
        toastSuccess('Budget enregistré.');
      } else if (lines.length > 0) {
        await createForecast(token, subAccountId, { yearMonth, lines });
        toastSuccess('Budget enregistré.');
      }
      await reload();
    } catch (err) {
      toastFromError(err, 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  };

  const openSpreadsheet = () => {
    const initial: DraftLine[] = forecast
      ? forecast.lines.map((line) => ({
          key: line.id,
          categoryId: line.categoryId,
          amount: centsToInput(line.plannedAmountCents),
          flow: line.flow ?? 'debit',
          scheduledDay: line.scheduledDay ?? null,
        }))
      : [
          {
            key: crypto.randomUUID(),
            categoryId: '',
            amount: '',
            flow: 'debit' as const,
            scheduledDay: null,
          },
        ];
    setSpreadsheetDraft(initial);
    setSpreadsheetBaseline(initial.map((row) => ({ ...row })));
    setSpreadsheetOpen(true);
  };

  const spreadsheetToInputs = (): ForecastLineInput[] | null => {
    const lines: ForecastLineInput[] = [];
    for (const row of spreadsheetDraft) {
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

  const saveSpreadsheet = async () => {
    const lines = spreadsheetToInputs();
    if (!lines) return;
    await persistLines(lines);
    setSpreadsheetOpen(false);
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

  const prevMonthLabel = useMemo(() => formatMonthLabel(shiftYearMonth(yearMonth, -1)), [yearMonth]);

  const publishChromeActions = useEffectEvent(() => {
    if (!onChromeActionsChange) return;
    onChromeActionsChange({
      busy,
      monthLabel: formatMonthLabel(yearMonth),
      onPrevMonth: () => setYearMonth((value) => shiftYearMonth(value, -1)),
      onNextMonth: () => setYearMonth((value) => shiftYearMonth(value, 1)),
      onOpenSpreadsheet: openSpreadsheet,
      canDelete: Boolean(forecast),
      onDelete: () => setDeleteOpen(true),
      canDuplicate: !forecast,
      onDuplicate: () => {
        void onDuplicate();
      },
      previousMonthLabel: prevMonthLabel,
    });
  });

  useEffect(() => {
    publishChromeActions();
    return () => onChromeActionsChange?.(null);
  }, [onChromeActionsChange, forecast, busy, yearMonth, prevMonthLabel]);
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
  const spreadsheetOrphans = stats?.previousMonth?.orphans ?? [];

  const spreadsheetTotals = useMemo(() => {
    let incomeCents = 0;
    let expenseCents = 0;
    for (const row of spreadsheetDraft) {
      const cents = parseEurosToCents(row.amount);
      if (cents === null || cents < 0) continue;
      const category = categories.find((item) => item.id === row.categoryId);
      const isCredit = category?.kind === 'income' || (category?.kind === 'both' && row.flow === 'credit');
      if (isCredit) incomeCents += cents;
      else expenseCents += cents;
    }
    return { incomeCents, expenseCents, netCents: incomeCents - expenseCents, count: spreadsheetDraft.length };
  }, [categories, spreadsheetDraft]);

  const spreadsheetDirty = useMemo(() => {
    if (spreadsheetDraft.length !== spreadsheetBaseline.length) return true;
    return spreadsheetDraft.some((row, index) => {
      const baseline = spreadsheetBaseline[index];
      return (
        !baseline ||
        row.key !== baseline.key ||
        row.categoryId !== baseline.categoryId ||
        row.amount !== baseline.amount ||
        row.flow !== baseline.flow ||
        row.scheduledDay !== baseline.scheduledDay
      );
    });
  }, [spreadsheetDraft, spreadsheetBaseline]);

  const addOrphanFromPrevious = (orphan: ForecastStatsPreviousCategory) => {
    const tone: BudgetTone = orphan.isExpense ? 'expense' : 'income';
    const flow = orphan.flow ?? (tone === 'income' ? 'credit' : 'debit');
    const previousLines = orphan.previousLines ?? [];

    if (previousLines.length > 1) {
      const existing = forecast ? forecastToLineInputs(forecast.lines) : [];
      const toAdd: ForecastLineInput[] = previousLines.map((line) => ({
        categoryId: orphan.categoryId,
        plannedAmountCents: line.plannedAmountCents,
        flow,
        scheduledDay: line.scheduledDay,
      }));
      void persistLines([...existing, ...toAdd]);
      return;
    }

    const single = previousLines[0];
    const seedCents =
      single !== undefined
        ? single.plannedAmountCents
        : orphan.previousPlannedAmountCents > 0
          ? orphan.previousPlannedAmountCents
          : orphan.previousActualAmountCents;

    setLineDialog({
      mode: 'create',
      tone,
      seed: {
        categoryId: orphan.categoryId,
        amount: centsToInput(seedCents),
        flow,
        scheduledDay: single !== undefined ? single.scheduledDay : null,
      },
    });
  };

  const submitLineDialog = async (values: ForecastLineFormValues, andContinue = false) => {
    const input = formValuesToInput(values);
    if (!input) return;

    if (lineDialog?.mode === 'edit') {
      if (!forecast) return;
      const next = forecast.lines.map((line) => (line.id === lineDialog.lineId ? input : forecastLineToInput(line)));
      await persistLines(next);
      setLineDialog(null);
      return;
    }

    const existing = forecast ? forecastToLineInputs(forecast.lines) : [];
    await persistLines([...existing, input]);

    if (andContinue && lineDialog?.mode === 'create') {
      setLineDialog({
        mode: 'create',
        tone: lineDialog.tone,
      });
      return;
    }

    setLineDialog(null);
  };

  const deleteLineFromDialog = async () => {
    if (!lineDialog || lineDialog.mode !== 'edit' || !forecast) return;
    const remaining = forecast.lines.filter((line) => line.id !== lineDialog.lineId);
    await persistLines(forecastToLineInputs(remaining));
    setLineDialog(null);
  };

  const deleteLineById = async (lineId: string) => {
    if (!forecast) return;
    const remaining = forecast.lines.filter((line) => line.id !== lineId);
    await persistLines(forecastToLineInputs(remaining));
  };

  const lineDialogInitial = useMemo((): ForecastLineFormValues => {
    if (!lineDialog) return emptyLineForm('expense');
    if (lineDialog.mode === 'edit' && forecast) {
      const line = forecast.lines.find((item) => item.id === lineDialog.lineId);
      if (line) {
        return {
          categoryId: line.categoryId,
          amount: centsToInput(line.plannedAmountCents),
          flow: line.flow ?? 'debit',
          scheduledDay: line.scheduledDay,
        };
      }
    }
    const tone = lineDialog.mode === 'create' ? lineDialog.tone : 'expense';
    return { ...emptyLineForm(tone), ...(lineDialog.mode === 'create' ? (lineDialog.seed ?? {}) : {}) };
  }, [lineDialog, forecast]);

  const lineDialogTone = useMemo((): BudgetTone => {
    if (!lineDialog) return 'expense';
    if (lineDialog.mode === 'create') return lineDialog.tone;
    const line = forecast?.lines.find((item) => item.id === lineDialog.lineId);
    if (!line) return 'expense';
    if (line.categoryKind === 'expense') return 'expense';
    if (line.categoryKind === 'income') return 'income';
    return line.flow === 'credit' ? 'income' : 'expense';
  }, [lineDialog, forecast]);

  const lineDialogTitle =
    lineDialog?.mode === 'edit'
      ? 'Modifier l’échéance'
      : lineDialogTone === 'income'
        ? 'Nouveau revenu'
        : 'Nouvelle dépense';

  const categoryDialogLines = useMemo(() => {
    if (!categoryDialogRow || !forecast) return [];
    return linesForCategoryGroup(forecast.lines, categoryDialogRow.categoryId, categoryDialogRow.flow);
  }, [categoryDialogRow, forecast]);

  const lineDialogEditContext = useMemo((): ForecastLineEditContext | null => {
    if (!lineDialog || lineDialog.mode !== 'edit' || !forecast) return null;
    const line = forecast.lines.find((item) => item.id === lineDialog.lineId);
    if (!line) return null;

    const siblings = linesForCategoryGroup(
      forecast.lines,
      line.categoryId,
      line.categoryKind === 'both' ? line.flow : null,
    );
    const aggregated =
      incomeCategories.find(
        (row) =>
          row.categoryId === line.categoryId &&
          (row.flow ?? null) === (line.categoryKind === 'both' ? line.flow : null),
      ) ??
      expenseCategories.find(
        (row) =>
          row.categoryId === line.categoryId &&
          (row.flow ?? null) === (line.categoryKind === 'both' ? line.flow : null),
      );

    return {
      categoryName: aggregated?.categoryName ?? line.categoryName,
      categoryIcon: aggregated?.categoryIcon ?? line.categoryIcon,
      categoryColor: aggregated?.categoryColor ?? line.categoryColor,
      plannedCents: aggregated?.plannedAmountCents ?? siblings.reduce((sum, item) => sum + item.plannedAmountCents, 0),
      actualCents: aggregated?.actualAmountCents ?? 0,
      remainingCents: aggregated?.remainingCents ?? 0,
      consumptionPercent: aggregated?.consumptionPercent ?? 0,
      siblingLines: siblings,
      editingLineId: line.id,
    };
  }, [lineDialog, forecast, incomeCategories, expenseCategories]);

  const openCategoryOrEdit = (row: AggregatedStatsCategory) => {
    if (!forecast) return;
    const lines = linesForCategoryGroup(forecast.lines, row.categoryId, row.flow);
    if (lines.length === 1) {
      setCategoryDialogRow(null);
      setLineDialog({ mode: 'edit', lineId: lines[0]!.id });
      return;
    }
    setCategoryDialogRow(row);
  };

  const operationsPrevious = operationsDialogRow
    ? (previousByKey.get(previousMonthKey(operationsDialogRow.categoryId, operationsDialogRow.flow)) ??
      previousByKey.get(previousMonthKey(operationsDialogRow.categoryId, null)))
    : undefined;

  return (
    <div className="mt-4 flex flex-col gap-4">
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
      ) : (
        <>
          {!forecast ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-dashed border-accent/30 bg-accent-tint/40 px-4 py-3">
              <p className="text-control text-fg-secondary">
                Pas encore de budget pour ce mois — ajoute une ligne avec <strong>+</strong> ou duplique{' '}
                {prevMonthLabel}.
              </p>
              <Button
                type="button"
                variant={BUTTON_VARIANT.success}
                fullWidth={false}
                className="h-9 w-auto shrink-0 px-3 text-control"
                loading={busy}
                onClick={() => void onDuplicate()}
              >
                Dupliquer {prevMonthLabel}
              </Button>
            </div>
          ) : null}

          {stats && (
            <div className="grid gap-3 lg:grid-cols-2 lg:items-stretch">
              <div className="grid h-full min-h-64 grid-cols-2 gap-3 sm:grid-cols-3 sm:grid-rows-2">
                <StatCard
                  label="Début de mois"
                  hint="Solde au 1er (date d’opération)"
                  icon="event"
                  tone="muted"
                  value={stats.balances.openingCents}
                />
                <StatCard
                  label="Si budget tenu"
                  hint="Début + plan complet"
                  icon="calendar_month"
                  tone="accent"
                  value={stats.balances.projectedBudgetCents}
                />
                <StatCard
                  label="Fin estimée"
                  hint="Réalisé + reste du plan"
                  icon="trending_up"
                  tone="accent"
                  value={stats.balances.projectedRealisticCents}
                />
                <StatCard
                  label="Solde pointé"
                  hint="Confirmé à ce jour (date effective)"
                  icon="account_balance_wallet"
                  tone="brand"
                  value={stats.balances.currentCents}
                />
                <StatCard
                  label="Solde réalisé"
                  hint="Début + opérations du mois"
                  icon="flag"
                  tone="success"
                  value={stats.balances.endOfMonthActualCents}
                />
                <StatCard
                  label="Écart au plan"
                  hint="Plan − réalisé (net)"
                  icon="compare_arrows"
                  tone="variance"
                  value={stats.balances.varianceBudgetVsActualNetCents}
                />
              </div>
              {stats.timeline.length > 0 ? (
                <BalanceTimelineChart
                  points={stats.timeline}
                  daysElapsed={stats.meta.daysElapsed}
                  categoryBars={toCategoryBars(aggregatedCategories)}
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
                emptyLabel="Aucun revenu planifié — appuie sur + pour commencer."
                onAdd={() => setLineDialog({ mode: 'create', tone: 'income' })}
                onOpenCategory={openCategoryOrEdit}
                onOpenOperations={setOperationsDialogRow}
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
                emptyLabel="Aucune dépense planifiée — appuie sur + pour commencer."
                onAdd={() => setLineDialog({ mode: 'create', tone: 'expense' })}
                onOpenCategory={openCategoryOrEdit}
                onOpenOperations={setOperationsDialogRow}
                onAddOrphan={addOrphanFromPrevious}
              />
            </div>
          )}

          {stats && stats.unbudgeted.items.length > 0 && (
            <div className="rounded-panel border border-border-subtle bg-elevated p-3">
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

      <ForecastLineDialog
        open={lineDialog !== null}
        mode={lineDialog?.mode ?? 'create'}
        tone={lineDialogTone}
        title={lineDialogTitle}
        categories={categories}
        daysInMonth={stats?.meta.daysInMonth}
        busy={busy}
        initial={lineDialogInitial}
        editContext={lineDialogEditContext}
        previousByKey={previousByKey}
        previousMonthLabel={prevMonthLabel}
        onClose={() => setLineDialog(null)}
        onSubmit={(values) => void submitLineDialog(values)}
        onSubmitAndContinue={
          lineDialog?.mode === 'create' ? (values) => void submitLineDialog(values, true) : undefined
        }
        onDelete={lineDialog?.mode === 'edit' ? () => void deleteLineFromDialog() : undefined}
        onCreateCategory={() => setCategoryCreateOpen(true)}
      />

      {categoryDialogRow ? (
        <ForecastCategoryDialog
          open={categoryDialogRow !== null}
          onClose={() => setCategoryDialogRow(null)}
          tone={isExpenseStatsRow(categoryDialogRow) ? 'expense' : 'income'}
          categoryName={categoryDialogRow.categoryName}
          categoryIcon={categoryDialogRow.categoryIcon}
          categoryColor={categoryDialogRow.categoryColor}
          plannedCents={categoryDialogRow.plannedAmountCents}
          actualCents={categoryDialogRow.actualAmountCents}
          remainingCents={categoryDialogRow.remainingCents}
          consumptionPercent={categoryDialogRow.consumptionPercent}
          lines={categoryDialogLines}
          busy={busy}
          onAddInstallment={() => {
            const tone = isExpenseStatsRow(categoryDialogRow) ? 'expense' : 'income';
            setLineDialog({
              mode: 'create',
              tone,
              seed: {
                categoryId: categoryDialogRow.categoryId,
                flow: categoryDialogRow.flow ?? (tone === 'income' ? 'credit' : 'debit'),
                scheduledDay: null,
                amount: '',
              },
            });
          }}
          onEditLine={(lineId) => {
            setCategoryDialogRow(null);
            setLineDialog({ mode: 'edit', lineId });
          }}
          onDeleteLine={(lineId) => void deleteLineById(lineId)}
        />
      ) : null}

      {operationsDialogRow ? (
        <ForecastCategoryOperationsDialog
          open={operationsDialogRow !== null}
          onClose={() => setOperationsDialogRow(null)}
          subAccountId={subAccountId}
          yearMonth={yearMonth}
          tone={isExpenseStatsRow(operationsDialogRow) ? 'expense' : 'income'}
          categoryId={operationsDialogRow.categoryId}
          categoryName={operationsDialogRow.categoryName}
          categoryIcon={operationsDialogRow.categoryIcon}
          categoryColor={operationsDialogRow.categoryColor}
          plannedCents={operationsDialogRow.plannedAmountCents}
          actualCents={operationsDialogRow.actualAmountCents}
          remainingCents={operationsDialogRow.remainingCents}
          consumptionPercent={operationsDialogRow.consumptionPercent}
          previousMonthLabel={prevMonthLabel}
          previousPlannedCents={operationsPrevious?.previousPlannedAmountCents ?? 0}
          previousActualCents={operationsPrevious?.previousActualAmountCents ?? 0}
        />
      ) : null}

      <Dialog
        isOpen={spreadsheetOpen}
        onClose={() => setSpreadsheetOpen(false)}
        title={`Vue tableur — ${formatMonthLabel(yearMonth)}`}
        icon="table_rows"
        size={DIALOG_SIZE.full}
      >
        <ForecastEditor
          isNew={!forecast}
          busy={busy}
          draft={spreadsheetDraft}
          categories={categories}
          daysInMonth={stats?.meta.daysInMonth}
          totals={spreadsheetTotals}
          previousByKey={previousByKey}
          previousMonthLabel={prevMonthLabel}
          orphans={spreadsheetOrphans}
          canReset={spreadsheetDirty}
          onCancel={() => setSpreadsheetOpen(false)}
          onReset={() => setSpreadsheetDraft(spreadsheetBaseline.map((row) => ({ ...row })))}
          onSave={() => void saveSpreadsheet()}
          onAdd={() =>
            setSpreadsheetDraft((rows) => [
              ...rows,
              {
                key: crypto.randomUUID(),
                categoryId: '',
                amount: '',
                flow: 'debit',
                scheduledDay: null,
              },
            ])
          }
          onRemove={(key) => setSpreadsheetDraft((rows) => rows.filter((item) => item.key !== key))}
          onPatch={(key, patch) =>
            setSpreadsheetDraft((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
          }
          onCreateCategory={() => setCategoryCreateOpen(true)}
          onAddOrphan={addOrphanFromPrevious}
        />
      </Dialog>

      <CategoryQuickCreate
        open={categoryCreateOpen}
        onClose={() => setCategoryCreateOpen(false)}
        onCreated={(category) => {
          onCategoryCreated?.(category);
          setCategoryCreateOpen(false);
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
        'relative flex h-full min-h-[6.5rem] flex-col overflow-hidden rounded-panel p-3 sm:min-h-0',
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
  onAdd,
  onOpenCategory,
  onOpenOperations,
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
  onAdd: () => void;
  onOpenCategory: (row: AggregatedStatsCategory) => void;
  onOpenOperations: (row: AggregatedStatsCategory) => void;
  onAddOrphan: (orphan: ForecastStatsPreviousCategory) => void;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-panel border border-border-subtle bg-elevated p-3">
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
          <button
            type="button"
            aria-label={`Ajouter ${tone === 'income' ? 'un revenu' : 'une dépense'}`}
            onClick={onAdd}
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-success text-success-strong transition-colors duration-(--duration-fast) hover:bg-success/10 active:bg-success/15"
          >
            <Icon name="add" className="text-icon-sm" />
          </button>
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
              onOpen={() => onOpenCategory(row)}
              onOpenOperations={() => onOpenOperations(row)}
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
  onOpen,
  onOpenOperations,
}: {
  row: AggregatedStatsCategory;
  tone: 'income' | 'expense';
  previous?: ForecastStatsPreviousCategory;
  previousMonthLabel: string;
  onOpen: () => void;
  onOpenOperations: () => void;
}) {
  const remainingLabel = forecastProgressRemainingLabel(row.remainingCents, tone);
  const daysLabel = row.scheduledDays.length > 0 ? ` · j.${row.scheduledDays.join(', ')}` : '';
  const metaClass = forecastProgressMetaClass(row.consumptionPercent, row.remainingCents, tone);

  return (
    <li
      className={cn(
        'relative flex items-center gap-0.5 overflow-hidden rounded-control transition-colors',
        forecastProgressRowSurfaceClass(row.consumptionPercent, row.remainingCents, tone),
      )}
    >
      <ForecastProgressTrack
        percent={row.consumptionPercent}
        remainingCents={row.remainingCents}
        tone={tone}
        variant="background"
      />
      <button
        type="button"
        onClick={onOpen}
        className="relative z-10 min-w-0 flex-1 cursor-pointer px-2.5 py-2 text-left"
      >
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

            <div className="mt-1 flex items-center justify-between gap-2">
              <span
                className={cn(
                  'inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums',
                  forecastProgressPercentBadgeClass(row.consumptionPercent, row.remainingCents, tone),
                )}
              >
                {forecastProgressPercentBadgeLabel(row.consumptionPercent, row.remainingCents)}
              </span>
              <p className={cn('min-w-0 truncate text-right text-[11px] tabular-nums', metaClass)}>
                {remainingLabel}
                {row.lineCount > 1 ? ` · ${row.lineCount} échéances` : ''}
              </p>
            </div>
          </div>
        </div>
      </button>
      <Tooltip content="Voir les opérations" className="relative z-10 shrink-0">
        <button
          type="button"
          aria-label={`Opérations de ${row.categoryName}`}
          onClick={onOpenOperations}
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-control-sm text-fg-muted transition-colors hover:bg-accent-tint/50 hover:text-accent"
        >
          <Icon name="receipt_long" className="text-[18px]!" />
        </button>
      </Tooltip>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Échéances de ${row.categoryName}`}
        className="relative z-10 mr-1.5 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-control-sm text-fg-muted transition-colors hover:bg-accent-tint/50 hover:text-accent"
      >
        <Icon name="chevron_right" className="text-[18px]!" />
      </button>
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
