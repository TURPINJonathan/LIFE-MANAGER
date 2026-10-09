import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { EmptyState, Icon, IconButton, ListCard, Popover, SectionCard, Tooltip, Typography } from '@components';
import {
  APP_PAGE_FILL_CLASSES,
  APP_PINNED_LIST_BODY_CLASSES,
  APP_PINNED_LIST_CHROME_CLASSES,
  ICON_BUTTON_VARIANT,
  POPOVER_PLACEMENT,
  accountLedgerPath,
  currentYearMonth,
  settingsPath,
  shiftYearMonth,
} from '@constants';
import { fetchForecastStatsDashboard, listAccounts, type ForecastYearSpan } from '@services';
import { useAuthStore, useDismissedAlertsStore } from '@store';
import type { Account, ForecastStats, SubAccount } from '@app-types';
import { cn, formatCents, signedAmountClass, toastFromError } from '@utils';

import { AccountsYearPanel } from './accounts-year-panel.component';
import { BalanceTimelineChart } from './balance-timeline-chart.component';
import { DeadlinesCalendarDialog } from './deadlines-calendar-dialog.component';
import {
  aggregateDashboardCategoryBars,
  aggregateDashboardForecast,
  aggregateDashboardTimeline,
  budgetStatusLabel,
  collectMonthDeadlines,
  collectUpcomingDeadlines,
  formatMonthLabel,
  formatYearPeriodLabel,
  monthDisplayBalanceCents,
  type FlatSubAccount,
} from './forecast.utils';

type AccountGroup = {
  account: Account;
  balanceCents: number;
  subs: SubAccount[];
};

type WatchItem = {
  key: string;
  dismissKey: string;
  sub: FlatSubAccount;
  kind: 'negative' | 'over';
  label: string;
  detail: string;
  value: string;
  to: string;
};

function consumptionPercent(actual: number, planned: number): number | null {
  if (planned <= 0) {
    return null;
  }
  return Math.round((actual / planned) * 100);
}

function FlowProgress({
  label,
  icon,
  plannedCents,
  actualCents,
  tone,
}: {
  label: string;
  icon: string;
  plannedCents: number;
  actualCents: number;
  tone: 'income' | 'expense';
}) {
  const percent = consumptionPercent(actualCents, plannedCents);
  const over = percent !== null && percent > 100 && tone === 'expense';
  const barWidth = percent === null ? 0 : Math.min(percent, 100);

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-control border p-2.5',
        tone === 'income'
          ? 'border-success/25 bg-success/8'
          : over
            ? 'border-error/25 bg-error/8'
            : 'border-accent/25 bg-accent-tint/70',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-1.5 text-control font-medium',
          tone === 'income' ? 'text-success-strong' : over ? 'text-error' : 'text-accent-press',
        )}
      >
        <Icon name={icon} className="text-icon-sm" />
        <span className="truncate">{label}</span>
      </div>
      <p
        className={cn(
          'truncate text-control tabular-nums font-semibold',
          over ? 'text-error' : tone === 'income' ? 'text-success-strong' : 'text-error',
        )}
      >
        {formatCents(actualCents)}
        {plannedCents > 0 ? <span className="font-normal text-fg-muted"> / {formatCents(plannedCents)}</span> : null}
        {percent !== null ? <span className="ml-1 font-normal text-fg-muted">({percent}%)</span> : null}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-elevated/80">
        <div
          className={cn(
            'h-full rounded-full transition-[width]',
            tone === 'income' ? 'bg-success' : over ? 'bg-error' : 'bg-accent',
          )}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="h-48 animate-pulse rounded-panel bg-subtle" />
        <div className="h-48 animate-pulse rounded-panel bg-subtle" />
        <div className="h-48 animate-pulse rounded-panel bg-subtle" />
        <div className="h-48 animate-pulse rounded-panel bg-subtle" />
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="h-56 animate-pulse rounded-panel bg-subtle lg:col-span-2" />
        <div className="h-56 animate-pulse rounded-panel bg-subtle" />
        <div className="h-56 animate-pulse rounded-panel bg-subtle" />
      </div>
    </div>
  );
}

function isYearMonth(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

function budgetSubtitle(status: 'ok' | 'over' | 'missing') {
  if (status === 'over') {
    return <span className="font-medium text-error">Dépassement</span>;
  }
  return undefined;
}

export function AccountsPage() {
  const token = useAuthStore((state) => state.token);
  const [searchParams, setSearchParams] = useSearchParams();
  const rawMonth = searchParams.get('mois');
  const yearMonth = isYearMonth(rawMonth) ? rawMonth : currentYearMonth();
  const previousYearMonth = useMemo(() => shiftYearMonth(yearMonth, -1), [yearMonth]);
  const monthLabel = useMemo(() => formatMonthLabel(yearMonth), [yearMonth]);
  const previousMonthLabel = useMemo(() => formatMonthLabel(previousYearMonth), [previousYearMonth]);
  const viewMode = searchParams.get('vue') === 'annee' ? 'year' : 'month';
  const [yearSpan, setYearSpan] = useState<ForecastYearSpan>('calendar');
  const periodLabel = useMemo(() => formatYearPeriodLabel(yearMonth, yearSpan), [yearMonth, yearSpan]);

  const setYearMonth = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === currentYearMonth()) params.delete('mois');
    else params.set('mois', next);
    setSearchParams(params);
  };

  const setViewMode = (next: 'month' | 'year') => {
    const params = new URLSearchParams(searchParams);
    if (next === 'year') params.set('vue', 'annee');
    else params.delete('vue');
    setSearchParams(params);
  };

  const shiftPeriod = (delta: number) => {
    setYearMonth(shiftYearMonth(yearMonth, delta * 12));
  };

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [statsBySubId, setStatsBySubId] = useState<Record<string, ForecastStats | null>>({});
  const [previousStatsBySubId, setPreviousStatsBySubId] = useState<Record<string, ForecastStats | null>>({});
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [showPreviousOnChart, setShowPreviousOnChart] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await listAccounts(token);
        if (cancelled) return;
        setAccounts(rows);
      } catch (err) {
        if (!cancelled) {
          toastFromError(err, 'Chargement impossible.');
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
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setForecastLoading(true);
    setStatsBySubId({});
    setPreviousStatsBySubId({});
    (async () => {
      try {
        const dashboard = await fetchForecastStatsDashboard(token, yearMonth, true);
        if (cancelled) return;
        setStatsBySubId(dashboard.current);
        setPreviousStatsBySubId(dashboard.previous);
      } catch (err) {
        if (!cancelled) {
          toastFromError(err, 'Chargement du mois impossible.');
          setStatsBySubId({});
          setPreviousStatsBySubId({});
        }
      } finally {
        if (!cancelled) setForecastLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, yearMonth]);

  const subs = useMemo<FlatSubAccount[]>(
    () =>
      accounts.flatMap((account) =>
        account.subAccounts.map((sub) => ({
          ...sub,
          accountName: account.name,
        })),
      ),
    [accounts],
  );

  const displayBalanceBySubId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const sub of subs) {
      map[sub.id] = monthDisplayBalanceCents(statsBySubId[sub.id], sub.provisionalBalanceCents);
    }
    return map;
  }, [subs, statsBySubId]);

  const groups = useMemo<AccountGroup[]>(
    () =>
      accounts.map((account) => ({
        account,
        balanceCents: account.subAccounts.reduce(
          (sum, sub) => sum + (displayBalanceBySubId[sub.id] ?? sub.provisionalBalanceCents),
          0,
        ),
        subs: account.subAccounts,
      })),
    [accounts, displayBalanceBySubId],
  );

  const totalBalance = useMemo(
    () => subs.reduce((sum, sub) => sum + (displayBalanceBySubId[sub.id] ?? sub.provisionalBalanceCents), 0),
    [subs, displayBalanceBySubId],
  );
  const negativeSubs = useMemo(
    () => [...subs].filter((sub) => sub.balanceCents < 0).sort((a, b) => a.balanceCents - b.balanceCents),
    [subs],
  );

  const distribution = useMemo(() => {
    const rows = subs.map((sub) => ({
      ...sub,
      displayBalanceCents: displayBalanceBySubId[sub.id] ?? sub.provisionalBalanceCents,
    }));
    const absoluteTotal = rows.reduce((sum, sub) => sum + Math.abs(sub.displayBalanceCents), 0);
    return [...rows]
      .sort((a, b) => Math.abs(b.displayBalanceCents) - Math.abs(a.displayBalanceCents))
      .slice(0, 3)
      .map((sub) => ({
        ...sub,
        share: absoluteTotal > 0 ? Math.round((Math.abs(sub.displayBalanceCents) / absoluteTotal) * 100) : 0,
      }));
  }, [subs, displayBalanceBySubId]);

  const forecast = useMemo(
    () => aggregateDashboardForecast(yearMonth, subs, statsBySubId),
    [yearMonth, subs, statsBySubId],
  );

  const timeline = useMemo(
    () => aggregateDashboardTimeline(subs, statsBySubId, previousStatsBySubId),
    [subs, statsBySubId, previousStatsBySubId],
  );

  const categoryBars = useMemo(() => aggregateDashboardCategoryBars(statsBySubId), [statsBySubId]);

  const upcomingDeadlines = useMemo(
    () => collectUpcomingDeadlines(subs, statsBySubId, 6, yearMonth),
    [subs, statsBySubId, yearMonth],
  );
  const monthDeadlines = useMemo(() => collectMonthDeadlines(subs, statsBySubId), [subs, statsBySubId]);

  const dismissed = useDismissedAlertsStore((state) => state.dismissed);
  const dismissAlert = useDismissedAlertsStore((state) => state.dismiss);

  const watchItems = useMemo<WatchItem[]>(() => {
    const items: WatchItem[] = [];
    const seen = new Set<string>();

    for (const sub of negativeSubs) {
      const dismissKey = `accounts:neg:${sub.id}:${sub.balanceCents}`;
      if (dismissed[dismissKey]) continue;
      items.push({
        key: `neg-${sub.id}`,
        dismissKey,
        sub,
        kind: 'negative',
        label: 'Solde négatif',
        detail: 'Le solde confirmé est sous zéro',
        value: formatCents(sub.balanceCents),
        to: accountLedgerPath(sub.id),
      });
      seen.add(sub.id);
    }

    for (const sub of forecast.overBudgetSubs) {
      if (seen.has(sub.id)) continue;
      const stats = statsBySubId[sub.id];
      const overCats = (stats?.categories ?? []).filter((row) => row.overBudget);
      const overshootCents = overCats.reduce(
        (sum, row) => sum + Math.max(0, row.actualAmountCents - row.plannedAmountCents),
        0,
      );
      const dismissKey = `accounts:over:${sub.id}:${yearMonth}:${overshootCents}`;
      if (dismissed[dismissKey]) continue;
      const detail =
        overCats.length === 0
          ? 'Budget dépassé'
          : overCats.length === 1
            ? `${overCats[0].categoryName} dépasse le plan`
            : `${overCats.length} catégories dépassent le plan`;

      items.push({
        key: `over-${sub.id}`,
        dismissKey,
        sub,
        kind: 'over',
        label: 'Dépassement budget',
        detail,
        value: overshootCents > 0 ? `+${formatCents(overshootCents)}` : 'Dépassé',
        to: accountLedgerPath(sub.id, 'budget'),
      });
      seen.add(sub.id);
    }

    return items.slice(0, 5);
  }, [negativeSubs, forecast.overBudgetSubs, statsBySubId, dismissed, yearMonth]);

  const hasAnySub = subs.length > 0;
  const hasForecastData = Object.keys(statsBySubId).length > 0 && !forecastLoading;
  const [watchOpen, setWatchOpen] = useState(false);
  const [deadlinesCalendarOpen, setDeadlinesCalendarOpen] = useState(false);
  const watchAnchorRef = useRef<HTMLButtonElement>(null);

  return (
    <div className={APP_PAGE_FILL_CLASSES}>
      <div className={APP_PINNED_LIST_CHROME_CLASSES}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <Typography variant="title" as="h1" className="truncate">
              Comptes
            </Typography>
          </div>
          <div className="flex items-center gap-0.5">
            <IconButton
              variant={ICON_BUTTON_VARIANT.ghost}
              icon="chevron_left"
              aria-label={viewMode === 'year' ? 'Période précédente' : 'Mois précédent'}
              onClick={() => (viewMode === 'year' ? shiftPeriod(-1) : setYearMonth(shiftYearMonth(yearMonth, -1)))}
            />
            <Typography
              variant="body"
              weight="semibold"
              className="min-w-[8.5rem] text-center tabular-nums sm:min-w-[11rem]"
            >
              {viewMode === 'year' ? periodLabel : monthLabel}
            </Typography>
            <IconButton
              variant={ICON_BUTTON_VARIANT.ghost}
              icon="chevron_right"
              aria-label={viewMode === 'year' ? 'Période suivante' : 'Mois suivant'}
              onClick={() => (viewMode === 'year' ? shiftPeriod(1) : setYearMonth(shiftYearMonth(yearMonth, 1)))}
            />
          </div>
          <div className="relative z-10 flex flex-1 items-center justify-end gap-0.5">
            {viewMode === 'year' ? (
              <div
                className="me-1 inline-flex rounded-control border border-border-subtle bg-subtle p-0.5"
                role="group"
                aria-label="Période annuelle"
              >
                <button
                  type="button"
                  onClick={() => setYearSpan('calendar')}
                  className={cn(
                    'h-8 cursor-pointer rounded-control px-2.5 text-control font-medium transition-colors',
                    yearSpan === 'calendar' ? 'bg-elevated text-fg-primary' : 'text-fg-muted hover:text-fg-primary',
                  )}
                >
                  Année {yearMonth.slice(0, 4)}
                </button>
                <button
                  type="button"
                  onClick={() => setYearSpan('rolling')}
                  className={cn(
                    'h-8 cursor-pointer rounded-control px-2.5 text-control font-medium transition-colors',
                    yearSpan === 'rolling' ? 'bg-elevated text-fg-primary' : 'text-fg-muted hover:text-fg-primary',
                  )}
                >
                  12 mois
                </button>
              </div>
            ) : null}
            <div
              className="inline-flex rounded-control border border-border-subtle bg-subtle p-0.5"
              role="group"
              aria-label="Vue du tableau de bord"
            >
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={cn(
                  'h-8 cursor-pointer rounded-control px-2.5 text-control font-medium transition-colors',
                  viewMode === 'month' ? 'bg-elevated text-fg-primary' : 'text-fg-muted hover:text-fg-primary',
                )}
              >
                Mois
              </button>
              <button
                type="button"
                onClick={() => setViewMode('year')}
                className={cn(
                  'h-8 cursor-pointer rounded-control px-2.5 text-control font-medium transition-colors',
                  viewMode === 'year' ? 'bg-elevated text-fg-primary' : 'text-fg-muted hover:text-fg-primary',
                )}
              >
                Année
              </button>
            </div>
            <button
              ref={watchAnchorRef}
              type="button"
              disabled={watchItems.length === 0}
              onClick={() => setWatchOpen((open) => !open)}
              className={cn(
                'relative inline-flex size-9 items-center justify-center rounded-control',
                watchItems.length > 0
                  ? 'cursor-pointer text-error hover:bg-subtle hover:text-error'
                  : 'cursor-not-allowed text-fg-muted opacity-60',
              )}
              aria-label={
                watchItems.length > 0
                  ? `À surveiller : ${watchItems.length} alerte${watchItems.length > 1 ? 's' : ''}`
                  : 'Rien à surveiller'
              }
              aria-expanded={watchItems.length > 0 ? watchOpen : undefined}
              aria-haspopup={watchItems.length > 0 ? 'dialog' : undefined}
              title={watchItems.length > 0 ? 'À surveiller' : 'Rien à signaler'}
            >
              <Icon name={watchItems.length > 0 ? 'notifications' : 'notifications_off'} className="text-icon-sm" />
              {watchItems.length > 0 ? (
                <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
                  {watchItems.length}
                </span>
              ) : null}
            </button>
            <Popover
              isOpen={watchOpen && watchItems.length > 0}
              onClose={() => setWatchOpen(false)}
              anchorRef={watchAnchorRef}
              placement={POPOVER_PLACEMENT.bottomEnd}
              label="À surveiller"
            >
              <div className="min-w-72 max-w-80 p-1">
                <p className="px-2 py-1.5 text-[11px] font-semibold tracking-wide text-fg-muted uppercase">
                  À surveiller
                </p>
                <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                  {watchItems.map((item) => (
                    <li key={item.key}>
                      <Link
                        to={item.to}
                        onClick={() => {
                          dismissAlert(item.dismissKey);
                          setWatchOpen(false);
                        }}
                        className="flex items-center justify-between gap-3 rounded-control px-2 py-2 text-body hover:bg-subtle"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-fg-primary">
                            {item.sub.name}
                            <span className="font-normal text-fg-muted"> · {item.sub.accountName}</span>
                          </span>
                          <span className="mt-0.5 block truncate text-control text-fg-muted">
                            {item.label} — {item.detail}
                          </span>
                        </span>
                        <span className="shrink-0 text-control font-semibold tabular-nums text-error">
                          {item.value}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Popover>
            <Link
              to={settingsPath('comptes')}
              className="inline-flex size-9 items-center justify-center rounded-control text-fg-secondary hover:bg-subtle hover:text-fg-primary"
              aria-label="Gérer la structure"
            >
              <Icon name="settings" className="text-icon-sm" />
            </Link>
          </div>
        </div>
      </div>

      <div className={`${APP_PINNED_LIST_BODY_CLASSES} flex flex-col gap-5`} data-app-scroll>
        {loading ? (
          <DashboardSkeleton />
        ) : !hasAnySub ? (
          <EmptyState
            fullHeight
            icon="account_balance_wallet"
            title="Aucun sous-compte"
            message="Crée un compte et des sous-comptes pour suivre soldes et budgets."
            action={
              <Link
                to={settingsPath('comptes')}
                className="mt-1 inline-flex h-11 items-center justify-center rounded-control bg-accent px-4 text-control font-medium text-white hover:bg-accent-press"
              >
                Ouvrir les paramètres
              </Link>
            }
          />
        ) : viewMode === 'year' ? (
          <AccountsYearPanel anchor={yearMonth} span={yearSpan} />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-4 lg:items-stretch">
              <section
                className={cn(
                  'relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-panel p-3',
                  hasForecastData && totalBalance < 0 ? 'bg-error/8' : 'bg-success/8',
                )}
              >
                <Icon
                  name="account_balance_wallet"
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none absolute top-1/2 -right-10 -translate-y-1/2 text-[10rem]! leading-none opacity-[0.12] sm:-right-12 sm:text-[12rem]!',
                    totalBalance < 0 ? 'text-error' : 'text-success-strong',
                  )}
                />
                <div className="relative z-10 min-h-[4.25rem]">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-control font-semibold text-fg-primary">Solde combiné</p>
                    <p className="text-[11px] text-fg-muted">{monthLabel}</p>
                  </div>
                  <p
                    className={cn(
                      'mt-1 text-[1.65rem] font-bold tracking-tight tabular-nums sm:text-[1.85rem]',
                      hasForecastData ? signedAmountClass(totalBalance) : 'text-fg-muted',
                    )}
                  >
                    {hasForecastData ? formatCents(totalBalance) : '…'}
                  </p>
                  <p className="mt-1 truncate text-[11px] tabular-nums text-fg-muted">
                    Fin estimée{' '}
                    <span
                      className={cn(
                        'font-semibold',
                        hasForecastData ? signedAmountClass(forecast.balances.projectedRealisticCents) : undefined,
                      )}
                    >
                      {hasForecastData ? formatCents(forecast.balances.projectedRealisticCents) : '…'}
                    </span>
                    <span className="mx-1.5 text-border">·</span>
                    Budget{' '}
                    <span
                      className={cn(
                        'font-semibold',
                        hasForecastData ? signedAmountClass(forecast.balances.projectedBudgetCents) : undefined,
                      )}
                    >
                      {hasForecastData ? formatCents(forecast.balances.projectedBudgetCents) : '…'}
                    </span>
                  </p>
                </div>

                <div className="relative z-10 mt-auto border-t border-border-subtle/80 pt-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-control font-medium text-fg-secondary">Flux du mois</p>
                    {forecast.meta ? (
                      <p className="text-[11px] text-fg-muted">
                        J{forecast.meta.daysElapsed}/{forecast.meta.daysInMonth}
                      </p>
                    ) : null}
                  </div>
                  {forecastLoading && !hasForecastData ? (
                    <p className="text-control text-fg-muted">Chargement…</p>
                  ) : forecast.withBudgetCount === 0 ? (
                    <EmptyState
                      compact
                      className="min-h-20 py-3"
                      icon="calendar_month"
                      title="Pas de budget ce mois"
                      message="Ajoute un budget sur un sous-compte pour suivre le flux."
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <FlowProgress
                        label="Revenus"
                        icon="arrow_upward"
                        plannedCents={forecast.totals.plannedIncomeCents}
                        actualCents={forecast.totals.actualIncomeCents}
                        tone="income"
                      />
                      <FlowProgress
                        label="Dépenses"
                        icon="arrow_downward"
                        plannedCents={forecast.totals.plannedExpenseCents}
                        actualCents={forecast.totals.actualExpenseCents}
                        tone="expense"
                      />
                    </div>
                  )}
                </div>
              </section>

              {groups.map(({ account, balanceCents, subs: accountSubs }) => {
                const accentSub = accountSubs[0];
                const accentColor = accentSub?.color;
                return (
                  <section
                    key={account.id}
                    className={cn(
                      'relative flex min-w-0 flex-col gap-2 overflow-hidden rounded-panel p-3',
                      groups.length === 1 && 'lg:col-span-3',
                      !accentColor && 'bg-elevated',
                    )}
                    style={
                      accentColor
                        ? {
                            backgroundColor: `color-mix(in srgb, ${accentColor} 12%, var(--color-elevated, #fff))`,
                          }
                        : undefined
                    }
                  >
                    {accentSub ? (
                      <Icon
                        name={accentSub.icon}
                        aria-hidden="true"
                        className="pointer-events-none absolute top-[55%] -right-14 -translate-y-1/2 !text-[14rem] leading-none opacity-[0.14] sm:-right-16 sm:!text-[16rem]"
                        style={{ color: accentColor }}
                      />
                    ) : null}
                    <div className="relative z-10 flex min-h-[4.25rem] shrink-0 items-end justify-between gap-2 px-0.5">
                      <div className="min-w-0">
                        <h2 className="truncate text-body font-semibold text-fg-primary">{account.name}</h2>
                        <p className="text-control text-fg-muted">
                          {accountSubs.length === 0
                            ? 'Aucun sous-compte'
                            : `${accountSubs.length} sous-compte${accountSubs.length > 1 ? 's' : ''}`}
                        </p>
                      </div>
                      {accountSubs.length > 0 && (
                        <p
                          className={cn(
                            'min-w-[6.5rem] shrink-0 text-right text-body font-semibold tabular-nums',
                            hasForecastData ? signedAmountClass(balanceCents) : 'text-fg-muted',
                          )}
                        >
                          {hasForecastData ? formatCents(balanceCents) : '…'}
                        </p>
                      )}
                    </div>

                    {accountSubs.length === 0 ? (
                      <div className="relative z-10 rounded-control border border-dashed border-border-subtle bg-elevated/70 px-3 py-3 text-control text-fg-muted">
                        <p>
                          Ajoute un sous-compte dans{' '}
                          <Link to={settingsPath('comptes')} className="text-accent hover:underline">
                            les paramètres
                          </Link>
                          .
                        </p>
                      </div>
                    ) : (
                      <ul className="relative z-10 m-0 flex list-none flex-col gap-2 p-0">
                        {accountSubs.map((sub) => {
                          const status = budgetStatusLabel(forecast.bySubId[sub.id]);
                          const displayBalance = displayBalanceBySubId[sub.id] ?? sub.provisionalBalanceCents;
                          return (
                            <li key={sub.id}>
                              <ListCard
                                to={accountLedgerPath(sub.id)}
                                title={sub.name}
                                subtitle={hasForecastData ? budgetSubtitle(status) : undefined}
                                avatarIcon={sub.icon}
                                tintColor={sub.color}
                                meta={
                                  <span
                                    className={cn(
                                      'inline-block min-w-[6.5rem] text-right text-body font-semibold tabular-nums',
                                      hasForecastData ? signedAmountClass(displayBalance) : 'text-fg-muted',
                                    )}
                                  >
                                    {hasForecastData ? formatCents(displayBalance) : '…'}
                                  </span>
                                }
                                actions={
                                  <Link
                                    to={accountLedgerPath(sub.id, 'budget')}
                                    className="inline-flex size-8 items-center justify-center rounded-control text-fg-muted hover:bg-subtle hover:text-accent"
                                    aria-label={`Budget ${sub.name}`}
                                    title="Budget"
                                  >
                                    <Icon name="calendar_month" className="text-icon-sm" />
                                  </Link>
                                }
                              />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-4 lg:items-stretch">
              <SectionCard
                title="Solde du mois"
                icon="analytics"
                tone="accent"
                bordered={false}
                className="min-w-0 lg:col-span-2"
              >
                {forecastLoading && timeline.points.length === 0 ? (
                  <p className="text-body text-fg-muted">Chargement de la projection…</p>
                ) : timeline.points.length === 0 ? (
                  <EmptyState
                    compact
                    className="min-h-52"
                    icon="analytics"
                    title="Pas encore de courbe"
                    message={`Dès qu’un sous-compte aura un budget sur ${monthLabel.toLowerCase()}, la projection s’affichera ici.`}
                  />
                ) : (
                  <BalanceTimelineChart
                    compact
                    className="min-h-52"
                    points={timeline.points}
                    daysElapsed={timeline.daysElapsed}
                    categoryBars={categoryBars}
                    previousActualPoints={showPreviousOnChart ? timeline.previousActualPoints : []}
                    previousMonthLabel={previousMonthLabel}
                    onTogglePrevious={
                      timeline.previousActualPoints.length > 0
                        ? () => setShowPreviousOnChart((value) => !value)
                        : undefined
                    }
                    showPrevious={showPreviousOnChart}
                  />
                )}
              </SectionCard>

              <SectionCard
                title="Échéances"
                icon="event_upcoming"
                tone="brand"
                bordered={false}
                className="flex min-w-0 flex-col lg:col-span-1"
                headerAction={
                  <Tooltip content="Calendrier du mois">
                    <IconButton
                      variant={ICON_BUTTON_VARIANT.ghost}
                      icon="calendar_month"
                      className="size-8"
                      aria-label="Ouvrir le calendrier des échéances"
                      onClick={() => setDeadlinesCalendarOpen(true)}
                    />
                  </Tooltip>
                }
              >
                {forecastLoading ? (
                  <p className="py-6 text-center text-body text-fg-muted">Chargement…</p>
                ) : upcomingDeadlines.length === 0 ? (
                  <EmptyState
                    compact
                    icon="event_upcoming"
                    title="Rien à venir"
                    message="Planifie un jour sur tes lignes de budget pour voir les prochaines échéances."
                  />
                ) : (
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {upcomingDeadlines.map((item) => (
                      <li key={item.key}>
                        <Link
                          to={accountLedgerPath(item.subAccountId, 'budget')}
                          className="grid grid-cols-[2rem_1.75rem_minmax(0,1fr)_auto] items-center gap-2 rounded-control border border-border-subtle/80 bg-elevated/80 px-2 py-1.5 hover:border-border hover:bg-elevated"
                        >
                          <span className="text-center text-[11px] font-semibold tabular-nums text-fg-muted">
                            j.{item.day}
                          </span>
                          <span
                            className="flex size-7 items-center justify-center rounded-control text-white"
                            style={{ backgroundColor: item.categoryColor }}
                            aria-hidden="true"
                          >
                            <Icon name={item.categoryIcon} className="text-icon-sm" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-control font-medium text-fg-primary">
                              {item.categoryName}
                            </span>
                            <span className="block truncate text-[11px] text-fg-muted">
                              {item.subAccountName} · {item.accountName}
                            </span>
                          </span>
                          <span
                            className={cn(
                              'min-w-[4.5rem] text-right text-control font-semibold tabular-nums',
                              item.isExpense ? 'text-error' : 'text-success-strong',
                            )}
                          >
                            {formatCents(item.amountCents)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              <SectionCard
                title="Répartition"
                icon="pie_chart"
                tone="success"
                bordered={false}
                className="flex min-w-0 flex-col lg:col-span-1"
              >
                {distribution.length === 0 ? (
                  <EmptyState
                    compact
                    icon="pie_chart"
                    title="Rien à répartir"
                    message="Les parts apparaîtront dès qu’un sous-compte aura un solde."
                  />
                ) : (
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {distribution.map((sub) => (
                      <li key={sub.id}>
                        <Link
                          to={accountLedgerPath(sub.id)}
                          className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 rounded-control border border-border-subtle/80 bg-elevated/80 px-2 py-2 hover:border-border hover:bg-elevated"
                        >
                          <span
                            className="row-span-2 flex size-7 items-center justify-center self-center rounded-control text-white"
                            style={{ backgroundColor: sub.color }}
                            aria-hidden="true"
                          >
                            <Icon name={sub.icon} className="text-icon-sm" />
                          </span>
                          <span className="min-w-0 truncate text-control">
                            <span className="font-medium text-fg-primary">{sub.name}</span>
                            <span className="text-fg-muted"> · {sub.accountName}</span>
                          </span>
                          <span className="shrink-0 text-control tabular-nums text-fg-muted">{sub.share}%</span>
                          <div className="col-span-2 col-start-2 h-1.5 overflow-hidden rounded-full bg-subtle">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${sub.share}%`, backgroundColor: sub.color }}
                            />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
          </>
        )}
      </div>
      <DeadlinesCalendarDialog
        open={deadlinesCalendarOpen}
        onClose={() => setDeadlinesCalendarOpen(false)}
        yearMonth={yearMonth}
        deadlines={monthDeadlines}
        subs={subs}
        token={token}
      />
    </div>
  );
}
