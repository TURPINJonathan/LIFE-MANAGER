import { useEffect, useEffectEvent, useState } from 'react';

import { Dialog, EmptyState, Icon, Spinner } from '@components';
import { DIALOG_SIZE } from '@constants';
import { MerchantVisual } from '@merchants';
import { fetchCategoryMonthTransactions } from '@services';
import { useAuthStore } from '@store';
import type { LedgerTransaction } from '@app-types';
import { cn, formatCents, formatIsoDateFr, signedAmountClass, toastFromError } from '@utils';

import { forecastProgressMetaClass, forecastProgressRemainingLabel, type BudgetTone } from './forecast-budget.utils';
import { ForecastProgressTrack } from './forecast-progress.component';

type ForecastCategoryOperationsDialogProps = {
  open: boolean;
  onClose: () => void;
  subAccountId: string;
  yearMonth: string;
  tone: BudgetTone;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  plannedCents: number;
  actualCents: number;
  remainingCents: number;
  consumptionPercent: number;
  previousMonthLabel: string;
  previousPlannedCents: number;
  previousActualCents: number;
};

export function ForecastCategoryOperationsDialog({
  open,
  onClose,
  subAccountId,
  yearMonth,
  tone,
  categoryId,
  categoryName,
  categoryIcon,
  categoryColor,
  plannedCents,
  actualCents,
  remainingCents,
  consumptionPercent,
  previousMonthLabel,
  previousPlannedCents,
  previousActualCents,
}: ForecastCategoryOperationsDialogProps) {
  const token = useAuthStore((state) => state.token);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const toneClass = tone === 'income' ? 'text-success-strong' : 'text-error';
  const underOrOnTarget = remainingCents >= 0;
  const diffLabel = forecastProgressRemainingLabel(remainingCents, tone);
  const diffClass = remainingCents < 0 ? (tone === 'income' ? 'text-success-strong' : 'text-error') : 'text-fg-primary';
  const diffValue = underOrOnTarget ? formatCents(remainingCents) : `−${formatCents(Math.abs(remainingCents))}`;
  const previousRemainingCents = previousPlannedCents - previousActualCents;
  const previousDiffValue =
    previousRemainingCents >= 0
      ? formatCents(previousRemainingCents)
      : `−${formatCents(Math.abs(previousRemainingCents))}`;

  const handleLoadError = useEffectEvent((err: unknown) => {
    toastFromError(err, 'Impossible de charger les opérations.');
    onClose();
  });

  useEffect(() => {
    if (!open || !token) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setTransactions([]);

    void (async () => {
      try {
        const payload = await fetchCategoryMonthTransactions(token, subAccountId, categoryId, yearMonth);
        if (!cancelled) {
          setTransactions(payload.transactions);
        }
      } catch (err) {
        if (!cancelled) {
          handleLoadError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, token, subAccountId, categoryId, yearMonth]);

  return (
    <Dialog isOpen={open} onClose={onClose} title={categoryName} icon="receipt_long" size={DIALOG_SIZE.large}>
      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-control border border-border-subtle bg-subtle/60 p-4 sm:flex-row sm:items-center sm:gap-4">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
            style={{ backgroundColor: categoryColor }}
          >
            <Icon name={categoryIcon} className="text-[1.35rem]!" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-fg-muted">Objectif</p>
                <p className="mt-0.5 truncate text-body font-semibold tabular-nums text-fg-primary">
                  {formatCents(plannedCents)}
                </p>
                <p className="mt-0.5 truncate text-[11px] tabular-nums text-fg-muted">
                  {previousMonthLabel} {formatCents(previousPlannedCents)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-fg-muted">Réalisé</p>
                <p className={cn('mt-0.5 truncate text-body font-semibold tabular-nums', toneClass)}>
                  {formatCents(actualCents)}
                </p>
                <p className="mt-0.5 truncate text-[11px] tabular-nums text-fg-muted">
                  {previousMonthLabel} {formatCents(previousActualCents)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-fg-muted">Écart</p>
                <p className={cn('mt-0.5 truncate text-body font-semibold tabular-nums', diffClass)}>{diffValue}</p>
                <p className="mt-0.5 truncate text-[11px] tabular-nums text-fg-muted">
                  {previousMonthLabel} {previousDiffValue}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <ForecastProgressTrack
                percent={consumptionPercent}
                remainingCents={remainingCents}
                tone={tone}
                variant="bar"
              />
              <span
                className={cn(
                  'shrink-0 text-[11px] tabular-nums',
                  forecastProgressMetaClass(consumptionPercent, remainingCents, tone),
                )}
              >
                {consumptionPercent}% · {diffLabel}
              </span>
            </div>
            {!loading ? (
              <p className="mt-2 text-control text-fg-muted">
                {transactions.length} opération{transactions.length === 1 ? '' : 's'} sur le mois
              </p>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Spinner />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            compact
            icon="receipt_long"
            title="Aucune opération"
            message="Aucune opération de cette catégorie sur ce mois."
            className="min-h-48"
          />
        ) : (
          <ul className="m-0 flex max-h-[min(70vh,36rem)] list-none flex-col gap-2 overflow-y-auto p-0">
            {transactions.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center gap-3 rounded-control border border-border-subtle bg-page/70 px-3 py-2.5 dark:bg-page/20"
              >
                {tx.merchant ? (
                  <MerchantVisual
                    name={tx.merchant.name}
                    color={tx.merchant.color}
                    icon={tx.merchant.icon}
                    imageUrl={tx.merchant.imageUrl}
                    className="size-9 shrink-0"
                    iconClassName="text-[15px]!"
                    showNativeTitle={false}
                  />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-subtle text-fg-muted">
                    <Icon name="payments" className="text-[15px]!" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-fg-primary">{tx.designation}</p>
                  <p className="truncate text-control text-fg-muted">
                    {formatIsoDateFr(tx.operationDate, { weekday: 'short' })}
                    {tx.merchant ? ` · ${tx.merchant.name}` : ''}
                  </p>
                </div>
                <p className={cn('shrink-0 text-body font-semibold tabular-nums', signedAmountClass(tx.amountCents))}>
                  {formatCents(tx.amountCents)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
