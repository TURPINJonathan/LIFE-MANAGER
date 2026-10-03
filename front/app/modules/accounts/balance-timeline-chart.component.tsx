import { useId, useMemo, useState } from 'react';

import type { ForecastTimelinePoint } from '@app-types';
import { cn, formatCents, formatIsoDateFr, signedAmountClass } from '@utils';

import type { CategoryBarItem } from './forecast.utils';

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
  /** Totaux du mois par catégorie (plan fantôme + réalisé plein), ancrés sur 0 €. */
  categoryBars?: CategoryBarItem[];
};

function sortCategoryBars(items: CategoryBarItem[]): CategoryBarItem[] {
  return [...items].sort(
    (a, b) =>
      Math.max(b.plannedCents, b.actualCents) - Math.max(a.plannedCents, a.actualCents) ||
      a.name.localeCompare(b.name, 'fr'),
  );
}

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

function buildIndexedPath(
  values: number[],
  fromIndex: number,
  toIndex: number,
  left: number,
  plotWidth: number,
  top: number,
  plotHeight: number,
  min: number,
  max: number,
): string {
  if (values.length === 0 || fromIndex > toIndex) return '';
  const count = values.length;
  let path = '';
  for (let index = fromIndex; index <= toIndex; index += 1) {
    const x = xFor(index, count, left, plotWidth);
    const y = yFor(values[index]!, min, max, top, plotHeight);
    path += `${index === fromIndex ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return path;
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
  categoryBars = [],
}: BalanceTimelineChartProps) {
  const uid = useId();
  const glowId = `${uid}-glow`;
  const fillId = `${uid}-fill`;
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [activeBarKey, setActiveBarKey] = useState<string | null>(null);

  const hasCategoryBars = categoryBars.length > 0;
  const width = 720;
  const height = compact ? 200 : 240;
  const left = 8;
  const right = 8;
  const top = compact ? 14 : 18;
  const bottom = hasCategoryBars ? (compact ? 22 : 26) : 8;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const previousByDay = useMemo(() => {
    const map = new Map<number, number>();
    for (const point of previousActualPoints) {
      map.set(point.day, point.balanceCents);
    }
    return map;
  }, [previousActualPoints]);

  const incomeBars = useMemo(() => sortCategoryBars(categoryBars.filter((item) => !item.isExpense)), [categoryBars]);
  const expenseBars = useMemo(() => sortCategoryBars(categoryBars.filter((item) => item.isExpense)), [categoryBars]);

  const chart = useMemo(() => {
    const previousValues = [...previousByDay.values()];
    const trajectoryValues = points.map((point) => point.realisticBalanceCents);
    const budgetValues = points.map((point) => point.budgetBalanceCents);
    const balanceValues = points.flatMap((point) => [
      point.budgetBalanceCents,
      point.realisticBalanceCents,
      ...(previousByDay.has(point.day) ? [previousByDay.get(point.day)!] : []),
    ]);

    // Barres en euros sur le même axe : revenus > 0, dépenses < 0, ancrées à 0.
    const barExtents = categoryBars.flatMap((item) => {
      const peak = Math.max(item.plannedCents, item.actualCents);
      return item.isExpense ? [-peak] : [peak];
    });

    const allValues = balanceValues.concat(previousValues, barExtents);
    const rawMin = allValues.length ? Math.min(...allValues, 0) : 0;
    const rawMax = allValues.length ? Math.max(...allValues, 0) : 1;
    const pad = Math.max(5_00, Math.round((rawMax - rawMin) * 0.12));
    const min = rawMin - pad;
    const max = rawMax + pad;

    const todayIndex = points.findIndex((point) => point.day === daysElapsed);
    const lastIndex = Math.max(0, points.length - 1);
    const splitIndex = todayIndex >= 0 ? todayIndex : daysElapsed < 0 ? -1 : lastIndex;

    const pastPath =
      splitIndex >= 0
        ? buildIndexedPath(trajectoryValues, 0, splitIndex, left, plotWidth, top, plotHeight, min, max)
        : '';
    const futurePath =
      splitIndex >= 0 && splitIndex < lastIndex
        ? buildIndexedPath(trajectoryValues, splitIndex, lastIndex, left, plotWidth, top, plotHeight, min, max)
        : splitIndex < 0
          ? buildIndexedPath(trajectoryValues, 0, lastIndex, left, plotWidth, top, plotHeight, min, max)
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
      zeroY: yFor(0, min, max, top, plotHeight),
      guides: buildGuides(min, max),
      budgetPath: buildPath(budgetValues, left, plotWidth, top, plotHeight, min, max),
      trajectoryArea: buildAreaPath(trajectoryValues, left, plotWidth, top, plotHeight, min, max),
      pastPath,
      futurePath,
      previousPath,
      endTrajectory: trajectoryValues.at(-1) ?? 0,
      endBudget: budgetValues.at(-1) ?? 0,
    };
  }, [categoryBars, daysElapsed, points, plotHeight, plotWidth, previousByDay, top]);

  if (points.length === 0) return null;

  const active = points.find((point) => point.day === activeDay) ?? null;
  const activeIndex = active ? points.findIndex((point) => point.day === active.day) : -1;
  const activeX = activeIndex >= 0 ? xFor(activeIndex, points.length, left, plotWidth) : null;
  const todayIndex = points.findIndex((point) => point.day === daysElapsed);
  const todayX = todayIndex <= 0 || points.length <= 1 ? null : xFor(todayIndex, points.length, left, plotWidth);
  const activePrevious = active ? (previousByDay.get(active.day) ?? null) : null;
  const activeBar = [...incomeBars, ...expenseBars].find((item) => item.key === activeBarKey) ?? null;

  const delta = chart.endTrajectory - chart.endBudget;
  const daysInMonth = Math.max(points.at(-1)?.day ?? 0, daysElapsed);
  const hasPrevious = Boolean(chart.previousPath);
  const canTogglePrevious = typeof onTogglePrevious === 'function';

  const formatPointLabel = (point: ForecastTimelinePoint): string => {
    if (point.day === 0) return 'Début du mois';
    return formatIsoDateFr(point.date);
  };

  const groupGap = 20;
  const incomeWidth = Math.max(40, (plotWidth - groupGap) / 2);
  const expenseWidth = incomeWidth;
  const incomeLeft = left;
  const expenseLeft = left + incomeWidth + groupGap;
  const midX = left + plotWidth / 2;

  const renderBarGroup = (items: CategoryBarItem[], groupLeft: number, groupWidth: number, expense: boolean) => {
    if (items.length === 0) return null;
    const slot = groupWidth / items.length;
    const zeroY = chart.zeroY;

    return (
      <g>
        {items.map((item, index) => {
          const cx = groupLeft + slot * index + slot / 2;
          const ghostW = Math.min(20, slot * 0.58);
          const solidW = Math.min(12, slot * 0.34);
          const plannedSigned = expense ? -item.plannedCents : item.plannedCents;
          const actualSigned = expense ? -item.actualCents : item.actualCents;
          const plannedY = item.plannedCents > 0 ? yFor(plannedSigned, chart.min, chart.max, top, plotHeight) : zeroY;
          const actualY = item.actualCents > 0 ? yFor(actualSigned, chart.min, chart.max, top, plotHeight) : zeroY;
          const ghostTop = Math.min(plannedY, zeroY);
          const ghostH = Math.abs(plannedY - zeroY);
          const solidTop = Math.min(actualY, zeroY);
          const solidH = Math.abs(actualY - zeroY);
          const isActive = activeBarKey === item.key;
          const labelY = expense ? Math.min(height - 4, zeroY + 11) : Math.max(top + 8, zeroY - 6);

          return (
            <g key={item.key}>
              <rect
                x={groupLeft + slot * index}
                y={top}
                width={slot}
                height={plotHeight}
                fill={isActive ? 'color-mix(in oklab, var(--fg-muted) 7%, transparent)' : 'transparent'}
                onMouseEnter={() => {
                  setActiveBarKey(item.key);
                  setActiveDay(null);
                }}
              />
              {ghostH > 0.5 ? (
                <rect
                  x={cx - ghostW / 2}
                  y={ghostTop}
                  width={ghostW}
                  height={ghostH}
                  rx={2}
                  fill={item.color}
                  fillOpacity={0.14}
                  stroke={item.color}
                  strokeOpacity={0.55}
                  strokeWidth={1}
                  strokeDasharray="3 2"
                  pointerEvents="none"
                />
              ) : null}
              {solidH > 0.5 ? (
                <rect
                  x={cx - solidW / 2}
                  y={solidTop}
                  width={solidW}
                  height={solidH}
                  rx={2}
                  fill={item.color}
                  fillOpacity={0.88}
                  pointerEvents="none"
                />
              ) : null}
              <text
                x={cx}
                y={labelY}
                textAnchor="middle"
                fill="color-mix(in oklab, var(--fg-muted) 88%, transparent)"
                fontSize={compact ? 7.5 : 8.5}
                pointerEvents="none"
              >
                {compact ? item.name.slice(0, 3) : item.name.length > 9 ? `${item.name.slice(0, 8)}…` : item.name}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  const legend = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fg-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center gap-0.5">
          <span className="h-0.5 w-2.5 rounded-full bg-accent" />
          <span className="h-px w-2.5 border-t border-dashed border-accent/70" />
        </span>
        Trajectoire
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-px w-3 border-t border-dashed border-fg-muted/50" />
        Budget
      </span>
      {hasCategoryBars ? (
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-2 rounded-sm border border-dashed border-fg-muted/50 bg-fg-muted/10" />
            Plan
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-2 rounded-sm bg-accent" />
            Réalisé
          </span>
        </>
      ) : null}
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
        compact ? 'min-h-56 rounded-control' : 'min-h-72 rounded-panel bg-elevated',
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
            <p className="text-[11px] font-medium tracking-[0.14em] text-fg-muted uppercase">Fin estimée</p>
            <p
              className={cn(
                'mt-1 text-[2rem] leading-none font-bold tracking-tight tabular-nums sm:text-[2.35rem]',
                signedAmountClass(chart.endTrajectory),
              )}
            >
              {formatCents(chart.endTrajectory)}
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
          className={cn('h-full w-full', compact ? 'min-h-44' : 'min-h-48 lg:min-h-0')}
          role="img"
          aria-label="Évolution du solde et totaux par catégorie sur le mois"
          onMouseLeave={() => {
            setActiveDay(null);
            setActiveBarKey(null);
          }}
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
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
              <stop offset="55%" stopColor="var(--accent)" stopOpacity="0.06" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Barres derrière la trajectoire, ancrées sur 0 € */}
          {hasCategoryBars ? (
            <g opacity={0.95}>
              {incomeBars.length > 0 ? (
                <text
                  x={incomeLeft + 2}
                  y={Math.max(top + 9, chart.zeroY - 8)}
                  fill="color-mix(in oklab, var(--fg-muted) 75%, transparent)"
                  fontSize={8}
                  fontWeight={500}
                  letterSpacing="0.06em"
                  pointerEvents="none"
                >
                  REVENUS
                </text>
              ) : null}
              {expenseBars.length > 0 ? (
                <text
                  x={expenseLeft + 2}
                  y={Math.min(top + plotHeight - 2, chart.zeroY + 12)}
                  fill="color-mix(in oklab, var(--fg-muted) 75%, transparent)"
                  fontSize={8}
                  fontWeight={500}
                  letterSpacing="0.06em"
                  pointerEvents="none"
                >
                  DÉPENSES
                </text>
              ) : null}
              <line
                x1={midX}
                x2={midX}
                y1={top}
                y2={top + plotHeight}
                stroke="color-mix(in oklab, var(--border) 35%, transparent)"
                strokeWidth={1}
                strokeDasharray="2 4"
              />
              {renderBarGroup(incomeBars, incomeLeft, incomeWidth, false)}
              {renderBarGroup(expenseBars, expenseLeft, expenseWidth, true)}
            </g>
          ) : null}

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
                stroke="color-mix(in oklab, var(--error) 55%, transparent)"
                strokeWidth={1.25}
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

          <path d={chart.trajectoryArea} fill={`url(#${fillId})`} />

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

          {chart.futurePath ? (
            <path
              d={chart.futurePath}
              fill="none"
              stroke="color-mix(in oklab, var(--accent) 72%, transparent)"
              strokeWidth={compact ? 2.5 : 3}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray="5 5"
            />
          ) : null}

          {chart.pastPath ? (
            <path
              d={chart.pastPath}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={compact ? 2.5 : 3}
              strokeLinejoin="round"
              strokeLinecap="round"
              filter={compact ? undefined : `url(#${glowId})`}
            />
          ) : null}

          {points.map((point, index) => {
            const x = xFor(index, points.length, left, plotWidth);
            const y = yFor(point.realisticBalanceCents, chart.min, chart.max, top, plotHeight);
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
                  onMouseEnter={() => {
                    setActiveDay(point.day);
                    setActiveBarKey(null);
                  }}
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

        {activeBar ? (
          <div
            className={cn(
              'pointer-events-none absolute right-3 bottom-3 left-3 sm:right-auto sm:left-3 sm:max-w-72',
              compact && 'right-0 bottom-0 left-0 sm:left-0',
            )}
          >
            <div className="rounded-control border border-border-subtle bg-card/90 px-3.5 py-2.5 shadow-lg backdrop-blur-xl dark:border-border dark:bg-elevated/90">
              <p className="text-[11px] font-medium tracking-wide text-fg-muted uppercase">{activeBar.name}</p>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                <span className="tabular-nums font-semibold text-fg-primary">
                  <span className="mr-1 font-normal text-fg-muted">Plan</span>
                  {formatCents(activeBar.plannedCents)}
                </span>
                <span className="tabular-nums font-semibold text-fg-primary">
                  <span className="mr-1 font-normal text-fg-muted">Réalisé</span>
                  {formatCents(activeBar.actualCents)}
                </span>
                <span
                  className={cn(
                    'tabular-nums font-semibold',
                    signedAmountClass(
                      activeBar.isExpense
                        ? activeBar.plannedCents - activeBar.actualCents
                        : activeBar.actualCents - activeBar.plannedCents,
                    ),
                  )}
                >
                  {activeBar.isExpense
                    ? formatCents(activeBar.plannedCents - activeBar.actualCents)
                    : formatCents(activeBar.actualCents - activeBar.plannedCents)}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {active && !activeBar ? (
          <div
            className={cn(
              'pointer-events-none absolute right-3 bottom-3 left-3 sm:right-auto sm:left-3 sm:max-w-72',
              compact && 'right-0 bottom-0 left-0 sm:left-0',
            )}
          >
            <div className="rounded-control border border-border-subtle bg-card/90 px-3.5 py-2.5 shadow-lg backdrop-blur-xl dark:border-border dark:bg-elevated/90">
              <p className="text-[11px] font-medium tracking-wide text-fg-muted uppercase">
                {formatPointLabel(active)}
                {active.day === daysElapsed && active.day > 0 ? ' · aujourd’hui' : ''}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                <span className={cn('tabular-nums font-semibold', signedAmountClass(active.realisticBalanceCents))}>
                  <span className="mr-1 font-normal text-fg-muted">
                    {active.day <= daysElapsed ? 'Solde' : 'Estimé'}
                  </span>
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
        ) : null}
      </div>
    </div>
  );
}
