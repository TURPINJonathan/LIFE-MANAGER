import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';

import { Icon, SectionCard } from '@components';
import { accountLedgerPath } from '@constants';
import {
  fetchForecastYearSeries,
  type ForecastYearCategory,
  type ForecastYearSeries,
  type ForecastYearSpan,
  type ForecastYearSubAccount,
} from '@services';
import { useAuthStore } from '@store';
import { cn, formatCents, signedAmountClass, toastFromError } from '@utils';

import { YearFlowChart, YearToneChart } from './year-flow-chart.component';

type AccountsYearPanelProps = {
  anchor: string;
  span: ForecastYearSpan;
};

function categoryIsExpenseGroup(row: ForecastYearCategory): boolean {
  if (row.categoryKind === 'expense') return true;
  if (row.categoryKind === 'income') return false;
  const expenseWeight = row.actualExpenseCents + row.plannedExpenseCents;
  const incomeWeight = row.actualIncomeCents + row.plannedIncomeCents;
  return expenseWeight >= incomeWeight;
}

function sortYearCategories(rows: ForecastYearCategory[]): ForecastYearCategory[] {
  return [...rows].sort((a, b) => {
    const aExpense = categoryIsExpenseGroup(a);
    const bExpense = categoryIsExpenseGroup(b);
    if (aExpense !== bExpense) return aExpense ? 1 : -1;
    return a.categoryName.localeCompare(b.categoryName, 'fr', { sensitivity: 'base' });
  });
}

function SummaryCard({
  label,
  icon,
  actualCents,
  plannedCents,
  tone,
}: {
  label: string;
  icon: string;
  actualCents: number;
  plannedCents: number;
  tone: 'income' | 'expense' | 'net';
}) {
  return (
    <div className="min-w-0 rounded-panel border border-border-subtle bg-elevated px-4 py-3">
      <p className="inline-flex items-center gap-1.5 text-control text-fg-muted">
        <Icon name={icon} className="text-icon-sm" />
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-[1.35rem] font-bold tracking-tight tabular-nums',
          tone === 'income'
            ? 'text-success-strong'
            : tone === 'expense'
              ? 'text-accent-press'
              : signedAmountClass(actualCents),
        )}
      >
        {formatCents(actualCents)}
      </p>
      <p className="mt-0.5 truncate text-[11px] tabular-nums text-fg-muted">Plan {formatCents(plannedCents)}</p>
    </div>
  );
}

function CategoryRow({ row }: { row: ForecastYearCategory }) {
  const isExpense = categoryIsExpenseGroup(row);
  const actual = isExpense ? row.actualExpenseCents : row.actualIncomeCents;
  const planned = isExpense ? row.plannedExpenseCents : row.plannedIncomeCents;
  const showBoth = row.actualIncomeCents > 0 && row.actualExpenseCents > 0;

  return (
    <li className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 rounded-control px-1 py-1.5">
      <span
        className="flex size-7 items-center justify-center rounded-control text-white"
        style={{ backgroundColor: row.categoryColor }}
        aria-hidden="true"
      >
        <Icon name={row.categoryIcon} className="text-icon-sm" />
      </span>
      <span className="min-w-0 truncate text-control font-medium text-fg-primary">{row.categoryName}</span>
      {showBoth ? (
        <span className="text-right text-[11px] tabular-nums text-fg-muted">
          <span className="text-success-strong">+{formatCents(row.actualIncomeCents)}</span>
          <span className="mx-1">/</span>
          <span className="text-accent-press">−{formatCents(row.actualExpenseCents)}</span>
        </span>
      ) : (
        <span
          className={cn(
            'text-right text-control font-semibold tabular-nums',
            isExpense ? 'text-accent-press' : 'text-success-strong',
          )}
        >
          {formatCents(actual)}
        </span>
      )}
      <span className="col-span-2 col-start-2 truncate text-[11px] tabular-nums text-fg-muted">
        Plan {formatCents(planned)}
      </span>
    </li>
  );
}

function CategoryYearCard({ row }: { row: ForecastYearCategory }) {
  const isExpense = categoryIsExpenseGroup(row);
  const showBoth = row.actualIncomeCents > 0 && row.actualExpenseCents > 0;
  const months = row.months ?? [];

  return (
    <section
      className="relative flex min-w-0 flex-col gap-2 overflow-hidden rounded-panel p-3"
      style={{
        backgroundColor: `color-mix(in srgb, ${row.categoryColor} 12%, var(--color-elevated, #fff))`,
      }}
    >
      <Icon
        name={row.categoryIcon}
        aria-hidden="true"
        className="pointer-events-none absolute top-[55%] -right-14 -translate-y-1/2 !text-[14rem] leading-none opacity-[0.14] sm:-right-16 sm:!text-[16rem]"
        style={{ color: row.categoryColor }}
      />
      <div className="relative z-10 flex items-center gap-2">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-control text-white"
          style={{ backgroundColor: row.categoryColor }}
          aria-hidden="true"
        >
          <Icon name={row.categoryIcon} className="text-icon-sm" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-body font-semibold text-fg-primary">{row.categoryName}</h3>
          <p className="text-control text-fg-muted">{isExpense ? 'Dépenses' : 'Revenus'}</p>
        </div>
      </div>
      <div className="relative z-10 grid grid-cols-2 gap-2 text-[11px] tabular-nums">
        {showBoth ? (
          <>
            <div>
              <p className="text-fg-muted">Revenus</p>
              <p className="font-semibold text-success-strong">{formatCents(row.actualIncomeCents)}</p>
              <p className="text-fg-muted">Plan {formatCents(row.plannedIncomeCents)}</p>
            </div>
            <div>
              <p className="text-fg-muted">Dépenses</p>
              <p className="font-semibold text-accent-press">{formatCents(row.actualExpenseCents)}</p>
              <p className="text-fg-muted">Plan {formatCents(row.plannedExpenseCents)}</p>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-fg-muted">Réalisé</p>
              <p
                className={cn(
                  'font-semibold',
                  isExpense ? 'text-accent-press' : 'text-success-strong',
                )}
              >
                {formatCents(isExpense ? row.actualExpenseCents : row.actualIncomeCents)}
              </p>
            </div>
            <div>
              <p className="text-fg-muted">Plan</p>
              <p className="font-semibold text-fg-primary">
                {formatCents(isExpense ? row.plannedExpenseCents : row.plannedIncomeCents)}
              </p>
            </div>
          </>
        )}
      </div>
      <div className="relative z-10 min-w-0">
        {showBoth ? (
          <div className="grid grid-cols-2 gap-2">
            <YearToneChart months={months} tone="income" compact height={120} stroke={row.categoryColor} />
            <YearToneChart months={months} tone="expense" compact height={120} stroke={row.categoryColor} />
          </div>
        ) : (
          <YearToneChart
            months={months}
            tone={isExpense ? 'expense' : 'income'}
            title={isExpense ? 'Dépenses' : 'Revenus'}
            compact
            height={140}
            stroke={row.categoryColor}
          />
        )}
      </div>
    </section>
  );
}

function SubAccountYearCard({ row }: { row: ForecastYearSubAccount }) {
  return (
    <section
      className="relative flex min-w-0 flex-col gap-2 overflow-hidden rounded-panel p-3"
      style={{
        backgroundColor: `color-mix(in srgb, ${row.color} 12%, var(--color-elevated, #fff))`,
      }}
    >
      <Icon
        name={row.icon}
        aria-hidden="true"
        className="pointer-events-none absolute top-[55%] -right-14 -translate-y-1/2 !text-[14rem] leading-none opacity-[0.14] sm:-right-16 sm:!text-[16rem]"
        style={{ color: row.color }}
      />
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-control text-white"
              style={{ backgroundColor: row.color }}
              aria-hidden="true"
            >
              <Icon name={row.icon} className="text-icon-sm" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-body font-semibold text-fg-primary">{row.subAccountName}</h3>
              <p className="truncate text-control text-fg-muted">{row.accountName}</p>
            </div>
          </div>
        </div>
        <Link
          to={accountLedgerPath(row.subAccountId)}
          className="shrink-0 text-control font-medium text-accent hover:underline"
        >
          Ouvrir
        </Link>
      </div>
      <div className="relative z-10 grid grid-cols-3 gap-2 text-[11px] tabular-nums">
        <div>
          <p className="text-fg-muted">Revenus</p>
          <p className="font-semibold text-success-strong">{formatCents(row.totals.actualIncomeCents)}</p>
        </div>
        <div>
          <p className="text-fg-muted">Dépenses</p>
          <p className="font-semibold text-accent-press">{formatCents(row.totals.actualExpenseCents)}</p>
        </div>
        <div>
          <p className="text-fg-muted">Solde</p>
          <p className={cn('font-semibold', signedAmountClass(row.totals.actualNetCents))}>
            {formatCents(row.totals.actualNetCents)}
          </p>
        </div>
      </div>
      <div className="relative z-10 min-w-0">
        <YearFlowChart months={row.months} compact />
      </div>
    </section>
  );
}

export function AccountsYearPanel({ anchor, span }: AccountsYearPanelProps) {
  const token = useAuthStore((state) => state.token);
  const [series, setSeries] = useState<ForecastYearSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    void fetchForecastYearSeries(token, anchor, span)
      .then((next) => {
        if (!cancelled) setSeries(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFailed(true);
          toastFromError(err, 'Chargement de la vue annuelle impossible.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, anchor, span]);

  const ready = !loading && !failed && series?.anchor === anchor && series.span === span;
  const categories = useMemo(
    () => (ready && series ? sortYearCategories(series.categories) : []),
    [ready, series],
  );

  if (failed) {
    return <p className="py-16 text-center text-body text-fg-muted">La vue annuelle n’a pas pu être chargée.</p>;
  }
  if (!ready || !series) {
    return <p className="py-16 text-center text-body text-fg-muted">Chargement…</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Revenus"
          icon="arrow_upward"
          actualCents={series.totals.actualIncomeCents}
          plannedCents={series.totals.plannedIncomeCents}
          tone="income"
        />
        <SummaryCard
          label="Dépenses"
          icon="arrow_downward"
          actualCents={series.totals.actualExpenseCents}
          plannedCents={series.totals.plannedExpenseCents}
          tone="expense"
        />
        <SummaryCard
          label="Solde"
          icon="account_balance_wallet"
          actualCents={series.totals.actualNetCents}
          plannedCents={series.totals.plannedNetCents}
          tone="net"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)] lg:items-stretch">
        <SectionCard title="Flux" icon="show_chart" tone="accent" bordered={false} className="min-w-0">
          <YearFlowChart months={series.months} />
        </SectionCard>
        {/* height:0 + min-height:100% : la ligne suit Flux, la liste défile dans la carte. */}
        <div className="min-w-0 lg:h-0 lg:min-h-full">
          <SectionCard
            title="Par catégorie"
            icon="category"
            tone="brand"
            bordered={false}
            className="h-full min-h-0 min-w-0"
          >
            {categories.length === 0 ? (
              <p className="py-6 text-center text-control text-fg-muted">Aucune catégorie sur la période.</p>
            ) : (
              <ul className="m-0 min-h-0 flex-1 list-none overflow-y-auto overscroll-contain p-0">
                {categories.map((row) => (
                  <CategoryRow key={row.categoryId} row={row} />
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-body font-semibold text-fg-primary">Graphiques par catégorie</h2>
        {categories.length === 0 ? (
          <p className="text-control text-fg-muted">Aucune catégorie sur la période.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((row) => (
              <CategoryYearCard key={row.categoryId} row={row} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-body font-semibold text-fg-primary">Par sous-compte</h2>
        {series.subAccounts.length === 0 ? (
          <p className="text-control text-fg-muted">Aucun sous-compte actif.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {series.subAccounts.map((row) => (
              <SubAccountYearCard key={row.subAccountId} row={row} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
