import { useId, useMemo, useState } from 'react';

import type { ForecastTimelinePoint } from '@app-types';
import { cn, formatCents, formatIsoDateFr, signedAmountClass } from '@utils';

type PreviousActualPoint = {
  day: number;
  balanceCents: number;
};

type BalanceTimelineChartProps = {
  points: ForecastTimelinePoint[];
  daysElapsed: number;
  className?: string;
  /** Mode encastré (dashboard) : sans grand hero, bordures légères. */
  compact?: boolean;
  previousActualPoints?: PreviousActualPoint[];
  previousMonthLabel?: string;
  showPrevious?: boolean;
  onTogglePrevious?: () => void;
};

function yFor(value: number, min: number, max: number, top: number, plotHeight: number): number {
  const span = Math.max(1, max - min);
  return top + (1 - (value - min) / span) * plotHeight;
}

function buildPath(
  values: number[],
  left: number,
  plotWidth: number,
  top: number,
  plotHeight: number,
  min: number,
  max: number,
): string {
  if (values.length === 0) return '';
  return values
    .map((value, index) => {
      const x = left + (values.length === 1 ? 0 : (index / (values.length - 1)) * plotWidth);
      const y = yFor(value, min, max, top, plotHeight);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function buildAreaPath(
  values: number[],
  left: number,
  plotWidth: number,
  top: number,
  plotHeight: number,
  min: number,
  max: number,
): string {
  const line = buildPath(values, left, plotWidth, top, plotHeight, min, max);
  if (!line || values.length === 0) return '';
  const bottom = top + plotHeight;
  const lastX = left + (values.length === 1 ? 0 : plotWidth);
  return `${line} L${lastX.toFixed(1)},${bottom.toFixed(1)} L${left.toFixed(1)},${bottom.toFixed(1)} Z`;
}

function buildGuides(min: number, max: number): number[] {
  const span = Math.max(1, max - min);
  const rough = span / 3;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const stepCandidates = [magnitude, magnitude * 2, magnitude * 2.5, magnitude * 5, magnitude * 10];
  const step = stepCandidates.find((candidate) => span / candidate <= 4) ?? magnitude * 10;
  const start = Math.floor(min / step) * step;
  const guides: number[] = [];
  for (let value = start; value <= max + step / 2; value += step) {
    if (value >= min - step / 10 && value <= max + step / 10) {
      guides.push(Math.round(value));
    }
  }
  if (!guides.includes(0) && min <= 0 && max >= 0) {
    guides.push(0);
    guides.sort((a, b) => a - b);
  }
  return guides;
}

function xFor(index: number, count: number, left: number, plotWidth: number): number {
  return left + (count === 1 ? 0 : (index / (count - 1)) * plotWidth);
}

export function BalanceTimelineChart({
  points,
  daysElapsed,
  className,
  compact = false,
  previousActualPoints = [],
  previousMonthLabel,
  showPrevious = true,
  onTogglePrevious,
}: BalanceTimelineChartProps) {
  const uid = useId();
  const glowId = `${uid}-glow`;
  const fillId = `${uid}-fill`;
  const [activeDay, setActiveDay] = useState<number | null>(null);

  const width = 720;
  const height = compact ? 168 : 200;
  const left = 8;
  const right = 8;
  const top = compact ? 12 : 16;
  const bottom = 8;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const previousByDay = useMemo(() => {
    const map = new Map<number, number>();
    for (const point of previousActualPoints) {
      map.set(point.day, point.balanceCents);
    }
    return map;
  }, [previousActualPoints]);

  const chart = useMemo(() => {
    const previousValues = [...previousByDay.values()];
    const values = points.flatMap((point) => [
      point.budgetBalanceCents,
      point.realisticBalanceCents,
      ...(point.actualBalanceCents === null ? [] : [point.actualBalanceCents]),
      ...(previousByDay.has(point.day) ? [previousByDay.get(point.day)!] : []),
    ]);
    const allValues = values.concat(previousValues);
    const rawMin = allValues.length ? Math.min(...allValues, 0) : 0;
    const rawMax = allValues.length ? Math.max(...allValues, 0) : 1;
    const pad = Math.max(5_00, Math.round((rawMax - rawMin) * 0.12));
    const min = rawMin - pad;
    const max = rawMax + pad;
    const budgetValues = points.map((point) => point.budgetBalanceCents);
    const realisticValues = points.map((point) => point.realisticBalanceCents);

    const actualSlice = points.filter((point) => point.actualBalanceCents !== null);
    const actualPath =
      actualSlice.length > 0
        ? actualSlice
            .map((point, index) => {
              const sourceIndex = points.findIndex((row) => row.day === point.day);
              const x = xFor(sourceIndex, points.length, left, plotWidth);
              const y = yFor(point.actualBalanceCents as number, min, max, top, plotHeight);
              return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ')
        : '';

    const previousPaired = points
      .map((point, index) => {
        const value = previousByDay.get(point.day);
        if (value === undefined) return null;
        return { index, value };
      })
      .filter((row): row is { index: number; value: number } => row !== null);

    const previousPath =
      previousPaired.length >= 2
        ? previousPaired
            .map((row, i) => {
              const x = xFor(row.index, points.length, left, plotWidth);
              const y = yFor(row.value, min, max, top, plotHeight);
              return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ')
        : '';

    return {
      min,
      max,
      guides: buildGuides(min, max),
      budgetPath: buildPath(budgetValues, left, plotWidth, top, plotHeight, min, max),
      realisticPath: buildPath(realisticValues, left, plotWidth, top, plotHeight, min, max),
      realisticArea: buildAreaPath(realisticValues, left, plotWidth, top, plotHeight, min, max),
      actualPath,
      previousPath,
      endRealistic: realisticValues.at(-1) ?? 0,
      endBudget: budgetValues.at(-1) ?? 0,
    };
  }, [points, plotHeight, plotWidth, previousByDay, top]);

  if (points.length === 0) return null;

  const active = points.find((point) => point.day === activeDay) ?? null;
  const activeIndex = active ? points.findIndex((point) => point.day === active.day) : -1;
  const activeX = activeIndex >= 0 ? xFor(activeIndex, points.length, left, plotWidth) : null;
  const todayIndex = points.findIndex((point) => point.day === daysElapsed);
  const todayX = todayIndex <= 0 || points.length <= 1 ? null : xFor(todayIndex, points.length, left, plotWidth);
  const activePrevious = active ? (previousByDay.get(active.day) ?? null) : null;

  const delta = chart.endRealistic - chart.endBudget;
  const daysInMonth = Math.max(points.at(-1)?.day ?? 0, daysElapsed);
  const hasPrevious = Boolean(chart.previousPath);
  const canTogglePrevious = typeof onTogglePrevious === 'function';

  const formatPointLabel = (point: ForecastTimelinePoint): string => {
    if (point.day === 0) return 'Début du mois';
    return formatIsoDateFr(point.date);
  };

  const legend = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fg-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0.5 w-3 rounded-full bg-fg-primary" />
        Réalisé
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
        Réaliste
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-px w-3 border-t border-dashed border-fg-muted/50" />
        Budget
      </span>
      {hasPrevious || canTogglePrevious ? (
        canTogglePrevious ? (
          <button
            type="button"
            onClick={onTogglePrevious}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-control px-1 py-0.5 hover:bg-subtle',
              !showPrevious && 'opacity-45 line-through',
            )}
            aria-pressed={showPrevious}
            title={showPrevious ? `Masquer ${previousMonthLabel ?? 'M−1'}` : `Afficher ${previousMonthLabel ?? 'M−1'}`}
          >
            <span className="h-px w-3 border-t border-fg-muted/40" />
            {previousMonthLabel ?? 'M−1'}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-3 border-t border-fg-muted/40" />
            {previousMonthLabel ?? 'M−1'}
          </span>
        )
      ) : null}
    </div>
  );

  return (
    <div
      className={cn(
        'relative flex h-full flex-col overflow-hidden text-fg-primary',
        compact
          ? 'min-h-52 rounded-control'
          : 'min-h-64 rounded-panel bg-elevated',
        className,
      )}
    >
      <div
        className={cn(
          'relative z-10 flex flex-wrap items-start justify-between gap-3',
          compact ? 'px-0.5 pt-0' : 'px-5 pt-5',
        )}
      >
        {compact ? (
          legend
        ) : (
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.14em] text-fg-muted uppercase">Projection réaliste</p>
            <p
              className={cn(
                'mt-1 text-[2rem] leading-none font-bold tracking-tight tabular-nums sm:text-[2.35rem]',
                signedAmountClass(chart.endRealistic),
              )}
            >
              {formatCents(chart.endRealistic)}
            </p>
            <p className="mt-2 text-[12px] text-fg-muted">
              Budget {formatCents(chart.endBudget)}
              <span className={cn('ml-2 font-semibold tabular-nums', signedAmountClass(delta))}>
                {delta > 0 ? '+' : ''}
                {formatCents(delta)}
              </span>
            </p>
          </div>
        )}

        <div className="flex flex-col items-end gap-2">
          <div
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] text-fg-secondary',
              compact
                ? 'bg-subtle'
                : 'border border-border-subtle bg-elevated/80 backdrop-blur-sm dark:border-border dark:bg-card/60',
            )}
          >
            J{Math.min(daysElapsed, daysInMonth)}
            <span className="text-fg-muted">/{daysInMonth || '—'}</span>
          </div>
          {!compact ? legend : null}
        </div>
      </div>

      <div className={cn('relative z-10 mt-2 min-h-0 flex-1', compact ? 'px-0 pb-0' : 'px-2 pb-2 sm:px-3 sm:pb-3')}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className={cn('h-full w-full', compact ? 'min-h-40' : 'min-h-40 lg:min-h-0')}
          role="img"
          aria-label="Évolution du solde sur le mois"
          onMouseLeave={() => setActiveDay(null)}
        >
          <defs>
            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
              <stop offset="55%" stopColor="var(--accent)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {chart.guides.map((guide) => {
            const y = yFor(guide, chart.min, chart.max, top, plotHeight);
            if (guide !== 0) return null;
            return (
              <line
                key={guide}
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
                stroke="color-mix(in oklab, var(--error) 50%, transparent)"
                strokeWidth={1}
                strokeDasharray="3 5"
              />
            );
          })}

          {todayX !== null && (
            <g>
              <line
                x1={todayX}
                x2={todayX}
                y1={top}
                y2={top + plotHeight}
                stroke="color-mix(in oklab, var(--fg-muted) 45%, transparent)"
                strokeWidth={1}
              />
              <circle cx={todayX} cy={top + 2} r={2.5} fill="var(--accent)" />
            </g>
          )}

          {activeX !== null && (
            <line
              x1={activeX}
              x2={activeX}
              y1={top}
              y2={top + plotHeight}
              stroke="color-mix(in oklab, var(--fg-secondary) 40%, transparent)"
              strokeWidth={1}
            />
          )}

          <path d={chart.realisticArea} fill={`url(#${fillId})`} />

          {chart.previousPath ? (
            <path
              d={chart.previousPath}
              fill="none"
              stroke="color-mix(in oklab, var(--fg-muted) 45%, transparent)"
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}

          <path
            d={chart.budgetPath}
            fill="none"
            stroke="color-mix(in oklab, var(--fg-muted) 55%, transparent)"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="4 5"
          />
          <path
            d={chart.realisticPath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={compact ? 2.5 : 3}
            strokeLinejoin="round"
            strokeLinecap="round"
            filter={compact ? undefined : `url(#${glowId})`}
          />
          {chart.actualPath ? (
            <path
              d={chart.actualPath}
              fill="none"
              stroke="var(--fg-primary)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}

          {points.map((point, index) => {
            const x = xFor(index, points.length, left, plotWidth);
            const y = yFor(
              point.actualBalanceCents ?? point.realisticBalanceCents,
              chart.min,
              chart.max,
              top,
              plotHeight,
            );
            const hasEvents = point.events.length > 0;
            const isActive = activeDay === point.day;
            return (
              <g key={point.day}>
                <rect
                  x={x - plotWidth / points.length / 2}
                  y={top}
                  width={plotWidth / points.length}
                  height={plotHeight}
                  fill="transparent"
                  onMouseEnter={() => setActiveDay(point.day)}
                />
                {(hasEvents || isActive) && (
                  <circle
                    cx={x}
                    cy={y}
                    r={isActive ? 5 : 3}
                    fill="var(--accent)"
                    stroke="var(--bg-card)"
                    strokeWidth={isActive ? 2 : 1}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {!compact && todayX !== null && (
          <div
            className="pointer-events-none absolute top-1 hidden -translate-x-1/2 rounded-full border border-border-subtle bg-card/80 px-2 py-0.5 text-[10px] font-medium tracking-wide text-fg-secondary uppercase backdrop-blur-md dark:border-border dark:bg-elevated/80 sm:block"
            style={{ left: `calc(${(todayX / width) * 100}% + 0.5rem)` }}
          >
            Aujourd’hui
          </div>
        )}

        {active && (
          <div
            className={cn(
              'pointer-events-none absolute right-3 bottom-3 left-3 sm:right-auto sm:left-3 sm:max-w-72',
              compact && 'right-0 bottom-0 left-0 sm:left-0',
            )}
          >
            <div className="rounded-2xl border border-border-subtle bg-card/90 px-3.5 py-2.5 shadow-lg backdrop-blur-xl dark:border-border dark:bg-elevated/90">
              <p className="text-[11px] font-medium tracking-wide text-fg-muted uppercase">
                {formatPointLabel(active)}
                {active.day === daysElapsed && active.day > 0 ? ' · aujourd’hui' : ''}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                {active.actualBalanceCents !== null ? (
                  <span className={cn('tabular-nums font-semibold', signedAmountClass(active.actualBalanceCents))}>
                    <span className="mr-1 font-normal text-fg-muted">Réalisé</span>
                    {formatCents(active.actualBalanceCents)}
                  </span>
                ) : null}
                <span className={cn('tabular-nums font-semibold', signedAmountClass(active.realisticBalanceCents))}>
                  <span className="mr-1 font-normal text-fg-muted">Réaliste</span>
                  {formatCents(active.realisticBalanceCents)}
                </span>
                <span className={cn('tabular-nums font-semibold', signedAmountClass(active.budgetBalanceCents))}>
                  <span className="mr-1 font-normal text-fg-muted">Budget</span>
                  {formatCents(active.budgetBalanceCents)}
                </span>
                {activePrevious !== null ? (
                  <span className={cn('tabular-nums font-semibold', signedAmountClass(activePrevious))}>
                    <span className="mr-1 font-normal text-fg-muted">{previousMonthLabel ?? 'M−1'}</span>
                    {formatCents(activePrevious)}
                  </span>
                ) : null}
              </div>
              {active.events.length > 0 && (
                <ul className="mt-2 space-y-1 border-t border-border-subtle pt-2 dark:border-border">
                  {active.events.slice(0, 3).map((event, index) => (
                    <li key={`${event.kind}-${index}`} className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-fg-secondary">
                        <span
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: event.categoryColor }}
                        />
                        <span className="truncate">{event.label}</span>
                      </span>
                      <span className={cn('shrink-0 tabular-nums', signedAmountClass(event.amountCents))}>
                        {formatCents(event.amountCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
