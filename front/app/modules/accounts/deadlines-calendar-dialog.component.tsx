import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';

import { Dialog, Icon, IconButton, Tooltip, Typography } from '@components';
import { DIALOG_SIZE, ICON_BUTTON_VARIANT, accountLedgerPath, shiftYearMonth } from '@constants';
import { fetchForecastStatsDashboard } from '@services';
import { cn, formatCents, toastFromError, todayIsoLocal } from '@utils';

import { collectMonthDeadlines, formatMonthLabel, type FlatSubAccount, type UpcomingDeadline } from './forecast.utils';

type DeadlinesCalendarDialogProps = {
  open: boolean;
  onClose: () => void;
  yearMonth: string;
  deadlines: UpcomingDeadline[];
  subs: FlatSubAccount[];
  token: string | null;
};

type CalendarCell = {
  iso: string;
  day: number;
};

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MAX_VISIBLE = 3;

function buildMonthCells(yearMonth: string): Array<CalendarCell | null> {
  const [year, month] = yearMonth.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const cells: Array<CalendarCell | null> = Array.from({ length: offset }, () => null);

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      iso: `${yearMonth}-${String(day).padStart(2, '0')}`,
      day,
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dayLabel(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function deadlinePath(item: UpcomingDeadline, yearMonth: string): string {
  return accountLedgerPath(item.subAccountId, 'budget', { yearMonth, lineId: item.lineId });
}

type DeadlineAccountGroup = {
  accountId: string;
  accountName: string;
  subs: Array<{
    subAccountId: string;
    subAccountName: string;
    items: UpcomingDeadline[];
  }>;
};

function groupDeadlinesByAccount(items: UpcomingDeadline[]): DeadlineAccountGroup[] {
  const accounts = new Map<string, DeadlineAccountGroup>();

  for (const item of items) {
    let account = accounts.get(item.accountId);
    if (!account) {
      account = { accountId: item.accountId, accountName: item.accountName, subs: [] };
      accounts.set(item.accountId, account);
    }

    let sub = account.subs.find((row) => row.subAccountId === item.subAccountId);
    if (!sub) {
      sub = { subAccountId: item.subAccountId, subAccountName: item.subAccountName, items: [] };
      account.subs.push(sub);
    }
    sub.items.push(item);
  }

  return [...accounts.values()]
    .map((account) => ({
      ...account,
      subs: [...account.subs].sort((a, b) => a.subAccountName.localeCompare(b.subAccountName, 'fr')),
    }))
    .sort((a, b) => a.accountName.localeCompare(b.accountName, 'fr'));
}

function DeadlineDetail({ item }: { item: UpcomingDeadline }) {
  const toneClass = item.isExpense ? 'text-error' : 'text-success-strong';
  const sign = item.isExpense ? '−' : '+';

  return (
    <div className="flex min-w-0 gap-2 text-left font-normal">
      <span
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-control-sm text-white"
        style={{ backgroundColor: item.categoryColor }}
        aria-hidden="true"
      >
        <Icon name={item.categoryIcon} className="text-[12px]!" />
      </span>
      <span className="min-w-0">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate font-medium">{item.categoryName}</span>
        </span>
        <span className="mt-0.5 block text-[11px] text-white/80">
          Planifié{' '}
          <span className={cn('font-semibold tabular-nums', toneClass)}>
            {sign}
            {formatCents(item.amountCents)}
          </span>
          {' · '}
          Réalisé{' '}
          <span className={cn('font-semibold tabular-nums', toneClass)}>
            {sign}
            {formatCents(item.actualAmountCents)}
          </span>
        </span>
        {item.monthEnd ? (
          <span className="mt-0.5 block text-[11px] text-white/70">Jour non fixé, portée en fin de mois</span>
        ) : null}
      </span>
    </div>
  );
}

function DayTooltip({ items, iso }: { items: UpcomingDeadline[]; iso: string }) {
  const groups = groupDeadlinesByAccount(items);

  return (
    <div className="flex w-72 flex-col gap-3">
      <p className="text-left text-[11px] font-semibold tracking-wide text-white/70 uppercase">{dayLabel(iso)}</p>
      {groups.map((account) => (
        <div key={account.accountId} className="flex flex-col gap-2">
          <p className="truncate text-left text-[12px] font-semibold text-white">{account.accountName}</p>
          {account.subs.map((sub) => (
            <div key={sub.subAccountId} className="flex flex-col gap-1.5 ps-1.5">
              {account.subs.length > 1 ? (
                <p className="truncate text-left text-[11px] font-medium text-white/70">{sub.subAccountName}</p>
              ) : null}
              {sub.items.map((item) => (
                <DeadlineDetail key={item.key} item={item} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function DeadlinesCalendarDialog({
  open,
  onClose,
  yearMonth,
  deadlines,
  subs,
  token,
}: DeadlinesCalendarDialogProps) {
  const [viewMonth, setViewMonth] = useState(yearMonth);
  const [fetched, setFetched] = useState<UpcomingDeadline[] | null>(null);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [expandedIso, setExpandedIso] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setViewMonth(yearMonth);
  }, [open, yearMonth]);

  useEffect(() => {
    setExpandedIso(null);
  }, [viewMonth]);

  useEffect(() => {
    if (!open || viewMonth === yearMonth) {
      setFetched(null);
      setLoadingMonth(false);
      return;
    }
    if (!token) return;

    let cancelled = false;
    setLoadingMonth(true);
    setFetched(null);
    (async () => {
      try {
        const dashboard = await fetchForecastStatsDashboard(token, viewMonth, false);
        if (cancelled) return;
        setFetched(collectMonthDeadlines(subs, dashboard.current));
      } catch (err) {
        if (!cancelled) {
          toastFromError(err, 'Chargement du mois impossible.');
          setFetched([]);
        }
      } finally {
        if (!cancelled) setLoadingMonth(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, viewMonth, yearMonth, token, subs]);

  const monthLabel = useMemo(() => formatMonthLabel(viewMonth), [viewMonth]);
  const cells = useMemo(() => buildMonthCells(viewMonth), [viewMonth]);
  const visibleDeadlines = useMemo(
    () => (viewMonth === yearMonth ? deadlines : (fetched ?? [])),
    [viewMonth, yearMonth, deadlines, fetched],
  );
  const showLoading = viewMonth !== yearMonth && (loadingMonth || fetched === null);
  const byDay = useMemo(() => {
    const map = new Map<number, UpcomingDeadline[]>();
    for (const item of visibleDeadlines) {
      const list = map.get(item.day);
      if (list) list.push(item);
      else map.set(item.day, [item]);
    }
    return map;
  }, [visibleDeadlines]);
  const today = todayIsoLocal();

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title="Échéances"
      icon="calendar_month"
      size={DIALOG_SIZE.wide}
      headerCenter={
        <div className="flex items-center gap-0.5">
          <IconButton
            variant={ICON_BUTTON_VARIANT.ghost}
            icon="chevron_left"
            aria-label="Mois précédent"
            onClick={() => setViewMonth((month) => shiftYearMonth(month, -1))}
          />
          <Typography
            variant="body"
            weight="semibold"
            className="min-w-[8.5rem] text-center tabular-nums sm:min-w-[11rem]"
          >
            {monthLabel}
          </Typography>
          <IconButton
            variant={ICON_BUTTON_VARIANT.ghost}
            icon="chevron_right"
            aria-label="Mois suivant"
            onClick={() => setViewMonth((month) => shiftYearMonth(month, 1))}
          />
        </div>
      }
    >
      <div className="mt-4 flex flex-col gap-3">
        {showLoading ? <p className="text-center text-control text-fg-muted">Chargement…</p> : null}
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label, index) => (
            <div key={`${label}-${index}`} className="py-1 text-center text-[11px] font-semibold text-fg-muted">
              {label}
            </div>
          ))}
          {showLoading
            ? null
            : cells.map((cell, index) => {
                if (!cell) {
                  return <div key={`empty-${index}`} className="min-h-[6.25rem]" />;
                }

                const items = byDay.get(cell.day) ?? [];
                const expanded = expandedIso === cell.iso;
                const visible = expanded ? items : items.slice(0, MAX_VISIBLE);
                const hiddenCount = items.length - visible.length;
                const isToday = cell.iso === today;
                const isPast = cell.iso < today;
                const side = index < 21 ? 'bottom' : 'top';

                const face = (
                  <div
                    className={cn(
                      'flex h-full min-h-[6.25rem] w-full flex-col gap-1 rounded-control-sm border px-1 py-1 text-left',
                      items.length > 0 ? 'border-border-subtle bg-elevated' : 'border-transparent bg-subtle/40',
                      isPast && items.length > 0 && 'opacity-75',
                      isToday && 'ring-2 ring-accent/45 ring-offset-1 ring-offset-card',
                    )}
                  >
                    <span
                      className={cn(
                        'px-0.5 text-[13px] font-semibold tabular-nums',
                        items.length > 0 ? 'text-fg-primary' : 'text-fg-muted',
                        isToday && 'text-accent-press',
                      )}
                    >
                      {cell.day}
                    </span>
                    {visible.length > 0 ? (
                      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                        {visible.map((item) => (
                          <li key={item.key}>
                            <Link
                              to={deadlinePath(item, viewMonth)}
                              aria-label={`${item.categoryName}, ${item.subAccountName}`}
                              className="flex min-w-0 items-center gap-1 rounded-control-sm bg-subtle/70 px-1 py-0.5 hover:bg-accent-tint"
                              onClick={onClose}
                            >
                              <span
                                className="size-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: item.categoryColor }}
                                aria-hidden="true"
                              />
                              <span className="min-w-0 flex-1 truncate text-[10px] leading-tight text-fg-primary">
                                {item.categoryName}
                              </span>
                              <span
                                className={cn(
                                  'hidden shrink-0 text-[10px] leading-tight font-medium tabular-nums sm:inline',
                                  item.isExpense ? 'text-error' : 'text-success-strong',
                                )}
                              >
                                {formatCents(item.amountCents)}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {hiddenCount > 0 ? (
                      <button
                        type="button"
                        className="px-0.5 text-left text-[10px] font-medium text-fg-muted hover:text-fg-primary"
                        onClick={() => setExpandedIso(cell.iso)}
                      >
                        +{hiddenCount}
                      </button>
                    ) : null}
                  </div>
                );

                if (items.length === 0) {
                  return (
                    <div key={cell.iso} className="min-w-0">
                      {face}
                    </div>
                  );
                }

                return (
                  <Tooltip
                    key={cell.iso}
                    side={side}
                    className="h-full w-full"
                    tipClassName="max-w-none px-3 py-2.5 text-left font-normal"
                    content={<DayTooltip items={items} iso={cell.iso} />}
                  >
                    {face}
                  </Tooltip>
                );
              })}
        </div>
      </div>
    </Dialog>
  );
}
