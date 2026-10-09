import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';

import { EmptyState, Icon, Popover, Typography } from '@components';
import {
  APP_PAGE_FILL_CLASSES,
  APP_PINNED_LIST_BODY_CLASSES,
  APP_PINNED_LIST_CHROME_CLASSES,
  POPOVER_PLACEMENT,
  currentYearMonth,
  settingsPath,
  shiftYearMonth,
  workJobPath,
} from '@constants';
import { fetchWorkDashboard } from '@services';
import { useAuthStore, useDismissedAlertsStore } from '@store';
import type { WorkDashboard } from '@app-types';
import { cn, formatCents, toastFromError } from '@utils';

import { formatMinutes } from './work.utils';

function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const label = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function HoursTimeline({ points }: { points: WorkDashboard['timeline'] }) {
  if (points.length === 0) return null;
  const max = Math.max(1, ...points.map((p) => Math.max(p.plannedCumulative, p.actualCumulative)));
  const w = 320;
  const h = 120;
  const pad = 8;
  const toX = (i: number) => pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2);
  const toY = (v: number) => h - pad - (v / max) * (h - pad * 2);

  const plannedPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.plannedCumulative).toFixed(1)}`)
    .join(' ');
  const actualPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.actualCumulative).toFixed(1)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full" role="img" aria-label="Heures cumulées du mois">
      <path d={plannedPath} fill="none" stroke="var(--accent-outline)" strokeWidth="2" strokeDasharray="4 3" />
      <path d={actualPath} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
    </svg>
  );
}

function HoursProgress({ actual, planned, compact = false }: { actual: number; planned: number; compact?: boolean }) {
  const max = Math.max(actual, planned, 1);
  const actualPct = Math.min(100, (actual / max) * 100);
  const plannedPct = Math.min(100, (planned / max) * 100);

  return (
    <div className={cn('relative', compact ? 'mt-1 h-1.5' : 'mt-3 h-2')} aria-hidden>
      <div className="absolute inset-0 rounded-full bg-subtle" />
      <div
        className="absolute inset-y-0 start-0 rounded-full bg-accent-outline/50"
        style={{ width: `${plannedPct}%` }}
      />
      <div className="absolute inset-y-0 start-0 rounded-full bg-accent" style={{ width: `${actualPct}%` }} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="h-48 animate-pulse rounded-panel bg-subtle" />
        <div className="h-48 animate-pulse rounded-panel bg-subtle lg:col-span-3" />
      </div>
      <div className="h-56 animate-pulse rounded-panel bg-subtle" />
    </div>
  );
}

export function WorkPage() {
  const token = useAuthStore((state) => state.token);
  const [yearMonth, setYearMonth] = useState(currentYearMonth);
  const [dashboard, setDashboard] = useState<WorkDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const alertsAnchorRef = useRef<HTMLButtonElement>(null);

  const monthLabel = useMemo(() => formatMonthLabel(yearMonth), [yearMonth]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchWorkDashboard(token, yearMonth);
        if (!cancelled) setDashboard(data);
      } catch (err) {
        if (!cancelled) toastFromError(err, 'Chargement impossible.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, yearMonth]);

  const hasJobs = (dashboard?.workers ?? []).some((w) => w.jobs.length > 0);
  const dismissed = useDismissedAlertsStore((state) => state.dismissed);
  const dismissAlert = useDismissedAlertsStore((state) => state.dismiss);
  const alerts = useMemo(() => {
    const rows = dashboard?.alerts ?? [];
    return rows
      .map((alert) => ({
        ...alert,
        dismissKey: `work:${alert.jobId}:${alert.kind}:${alert.value}`,
      }))
      .filter((alert) => !dismissed[alert.dismissKey]);
  }, [dashboard?.alerts, dismissed]);

  return (
    <div className={APP_PAGE_FILL_CLASSES}>
      <div className={APP_PINNED_LIST_CHROME_CLASSES}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <Typography variant="title" as="h1" className="truncate">
              Travail
            </Typography>
          </div>
          <div className="relative z-10 flex max-w-full flex-wrap items-center justify-end gap-0.5">
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-control text-fg-secondary hover:bg-subtle"
              aria-label="Mois précédent"
              onClick={() => setYearMonth((ym) => shiftYearMonth(ym, -1))}
            >
              <Icon name="chevron_left" className="text-icon-sm" />
            </button>
            <span className="min-w-0 max-w-[9rem] truncate px-1 text-center text-control font-medium tabular-nums sm:max-w-none sm:min-w-28">
              {monthLabel}
            </span>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-control text-fg-secondary hover:bg-subtle"
              aria-label="Mois suivant"
              onClick={() => setYearMonth((ym) => shiftYearMonth(ym, 1))}
            >
              <Icon name="chevron_right" className="text-icon-sm" />
            </button>
            <button
              ref={alertsAnchorRef}
              type="button"
              disabled={alerts.length === 0}
              onClick={() => setAlertsOpen((o) => !o)}
              className={cn(
                'relative inline-flex size-9 items-center justify-center rounded-control',
                alerts.length > 0
                  ? 'cursor-pointer text-error hover:bg-subtle'
                  : 'cursor-not-allowed text-fg-muted opacity-60',
              )}
              aria-label={alerts.length > 0 ? `Alertes : ${alerts.length}` : 'Aucune alerte'}
            >
              <Icon name={alerts.length > 0 ? 'notifications' : 'notifications_off'} className="text-icon-sm" />
              {alerts.length > 0 ? (
                <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
                  {alerts.length}
                </span>
              ) : null}
            </button>
            <Popover
              isOpen={alertsOpen && alerts.length > 0}
              onClose={() => setAlertsOpen(false)}
              anchorRef={alertsAnchorRef}
              placement={POPOVER_PLACEMENT.bottomEnd}
              label="À surveiller"
            >
              <ul className="min-w-72 max-w-80 list-none p-1">
                {alerts.map((alert, i) => (
                  <li key={`${alert.jobId}-${alert.kind}-${i}`}>
                    <Link
                      to={workJobPath(alert.jobId)}
                      onClick={() => {
                        dismissAlert(alert.dismissKey);
                        setAlertsOpen(false);
                      }}
                      className="flex items-center justify-between gap-3 rounded-control px-2 py-2 hover:bg-subtle"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{alert.label}</span>
                        <span className="block truncate text-control text-fg-muted">{alert.detail}</span>
                      </span>
                      <span className="shrink-0 text-control font-semibold text-error">
                        {formatMinutes(alert.value)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Popover>
            <Link
              to={settingsPath('travail')}
              className="inline-flex size-9 items-center justify-center rounded-control text-fg-secondary hover:bg-subtle hover:text-fg-primary"
              aria-label="Gérer travailleurs et emplois"
            >
              <Icon name="settings" className="text-icon-sm" />
            </Link>
          </div>
        </div>
      </div>

      <div className={`${APP_PINNED_LIST_BODY_CLASSES} flex flex-col gap-5`} data-app-scroll>
        {loading || !dashboard ? (
          <DashboardSkeleton />
        ) : !hasJobs ? (
          <EmptyState
            fullHeight
            icon="work"
            title="Aucun emploi"
            message="Créez un travailleur et un emploi dans les paramètres pour suivre le mois."
            action={
              <Link
                to={settingsPath('travail')}
                className="mt-1 inline-flex h-11 items-center justify-center rounded-control bg-accent px-4 text-control font-medium text-white hover:bg-accent-press"
              >
                Ouvrir les paramètres
              </Link>
            }
          />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-4 lg:items-stretch">
              <section className="relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-panel bg-accent-tint/70 p-3">
                <Icon
                  name="schedule"
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 -right-10 -translate-y-1/2 text-[10rem]! leading-none text-accent opacity-[0.12]"
                />
                <div className="relative z-10">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-control font-semibold">Synthèse du mois</p>
                    <p className="text-[11px] text-fg-muted">{monthLabel}</p>
                  </div>
                  <p className="mt-1 text-[1.65rem] font-bold tabular-nums text-brand">
                    {formatMinutes(dashboard.totals.actualMinutes)}
                  </p>
                  <p className="mt-1 text-[11px] text-fg-muted">
                    Prévu{' '}
                    <span className="font-semibold text-fg-secondary">
                      {formatMinutes(dashboard.totals.plannedMinutes)}
                    </span>
                    <span className="mx-1.5 text-border">·</span>
                    Écart{' '}
                    <span
                      className={cn(
                        'font-semibold',
                        dashboard.totals.deltaMinutes < 0 ? 'text-error' : 'text-success-strong',
                      )}
                    >
                      {dashboard.totals.deltaMinutes >= 0 ? '+' : '−'}
                      {formatMinutes(Math.abs(dashboard.totals.deltaMinutes))}
                    </span>
                  </p>
                  <HoursProgress actual={dashboard.totals.actualMinutes} planned={dashboard.totals.plannedMinutes} />
                </div>
                <div className="relative z-10 mt-auto grid grid-cols-2 gap-2 border-t border-border-subtle/80 pt-3">
                  <div className="rounded-control border border-accent/25 bg-elevated/70 p-2">
                    <p className="text-[11px] text-fg-muted">Brut estimé</p>
                    <p className="font-semibold tabular-nums">{formatCents(dashboard.totals.actualGrossCents)}</p>
                    <p className="text-[11px] text-fg-muted">prévu {formatCents(dashboard.totals.plannedGrossCents)}</p>
                  </div>
                  <div className="rounded-control border border-accent/25 bg-elevated/70 p-2">
                    <p className="text-[11px] text-fg-muted">Net estimé</p>
                    <p className="font-semibold tabular-nums text-brand">
                      {formatCents(dashboard.totals.actualNetPayableCents)}
                    </p>
                    <p className="text-[11px] text-fg-muted">
                      prévu {formatCents(dashboard.totals.plannedNetPayableCents)}
                    </p>
                  </div>
                </div>
              </section>

              {dashboard.workers.map((worker) => (
                <section
                  key={worker.id}
                  className={cn(
                    'relative flex min-w-0 flex-col gap-2 overflow-hidden rounded-panel bg-elevated p-3',
                    dashboard.workers.length === 1 && 'lg:col-span-3',
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-control font-semibold">{worker.fullName}</p>
                    <p className="shrink-0 text-[11px] tabular-nums text-fg-muted">
                      {formatMinutes(worker.actualMinutes)}
                    </p>
                  </div>
                  <p className="text-[11px] text-fg-muted">
                    Prévu {formatMinutes(worker.plannedMinutes)} · Net {formatCents(worker.actualNetPayableCents)}
                  </p>
                  <HoursProgress actual={worker.actualMinutes} planned={worker.plannedMinutes} compact />
                  <ul className="mt-1 flex flex-col gap-1.5">
                    {worker.jobs.length === 0 ? (
                      <li className="text-control text-fg-muted">Aucun emploi</li>
                    ) : (
                      worker.jobs.map((row) => (
                        <li key={row.job.id}>
                          <Link
                            to={workJobPath(row.job.id)}
                            className="flex items-center justify-between gap-2 rounded-control px-2 py-1.5 hover:bg-subtle"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className="flex size-7 shrink-0 items-center justify-center rounded-control-sm bg-accent text-white"
                                style={row.job.color ? { backgroundColor: row.job.color } : undefined}
                              >
                                <Icon name={row.job.icon ?? 'work'} className="text-[1rem]!" />
                              </span>
                              <span className="min-w-0 truncate text-control font-medium">
                                {row.job.title}
                                <span className="font-normal text-fg-muted"> · {row.job.companyName}</span>
                              </span>
                            </span>
                            <span className="shrink-0 text-control tabular-nums text-fg-secondary">
                              {formatMinutes(row.actual.workedMinutes)}
                            </span>
                          </Link>
                        </li>
                      ))
                    )}
                  </ul>
                </section>
              ))}
            </div>

            <section className="rounded-panel border border-border-subtle bg-elevated p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-control font-semibold">Heures cumulées</p>
                <p className="text-[11px] text-fg-muted">
                  <span className="me-3 inline-flex items-center gap-1">
                    <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-accent-outline" />
                    Prévu
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-0.5 w-4 bg-accent" />
                    Réel
                  </span>
                </p>
              </div>
              <HoursTimeline points={dashboard.timeline} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
