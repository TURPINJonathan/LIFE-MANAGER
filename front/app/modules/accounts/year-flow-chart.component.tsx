import { useCallback, useId, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { formatCents } from '@utils';

export type YearFlowMonth = {
  yearMonth: string;
  actualIncomeCents: number;
  actualExpenseCents: number;
  actualNetCents?: number;
  plannedIncomeCents: number;
  plannedExpenseCents: number;
  plannedNetCents?: number;
};

type YearFlowChartProps = {
  months: YearFlowMonth[];
  /** Cartes sous-compte : courbes plus compactes, sans légende. */
  compact?: boolean;
};

type YearToneChartProps = {
  months: YearFlowMonth[];
  tone: 'income' | 'expense';
  title?: string;
  compact?: boolean;
  height?: number;
  stroke?: string;
};

type HoverState = {
  index: number;
  clientX: number;
  clientY: number;
};

function shortMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
}

function axisEuros(cents: number): string {
  const euros = Math.abs(cents) / 100;
  if (euros >= 1000) {
    return `${(euros / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k€`;
  }
  return `${Math.round(euros).toLocaleString('fr-FR')} €`;
}

function monthLabel(months: YearFlowMonth[], index: number, compact: boolean): string {
  const month = months[index]!;
  if (compact) return shortMonth(month.yearMonth).slice(0, 1);
  const year = month.yearMonth.slice(2, 4);
  const previousYear = index > 0 ? months[index - 1]!.yearMonth.slice(0, 4) : null;
  const showYear = index === 0 || month.yearMonth.slice(0, 4) !== previousYear;
  return showYear ? `${shortMonth(month.yearMonth)} ${year}` : shortMonth(month.yearMonth);
}

function fullMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function buildPath(values: number[], left: number, plotWidth: number, yFor: (value: number) => number): string {
  if (values.length === 0) return '';
  return values
    .map((value, index) => {
      const x = left + (values.length === 1 ? 0 : (index / (values.length - 1)) * plotWidth);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${yFor(value).toFixed(1)}`;
    })
    .join(' ');
}

function xForIndex(index: number, count: number, left: number, plotWidth: number): number {
  return left + (count === 1 ? 0 : (index / (count - 1)) * plotWidth);
}

function ChartTooltip({
  hover,
  label,
  lines,
}: {
  hover: HoverState;
  label: string;
  lines: Array<{ text: string; className?: string }>;
}) {
  return (
    <div
      className="pointer-events-none fixed z-50 min-w-36 rounded-control border border-border-subtle bg-elevated px-2.5 py-2 shadow-md"
      style={{
        left: Math.min(hover.clientX + 14, (typeof window === 'undefined' ? 1200 : window.innerWidth) - 180),
        top: Math.max(8, hover.clientY - 12),
      }}
      role="tooltip"
    >
      <p className="text-control font-semibold text-fg-primary">{label}</p>
      {lines.map((line) => (
        <p key={line.text} className={line.className ?? 'mt-0.5 text-[11px] tabular-nums text-fg-muted'}>
          {line.text}
        </p>
      ))}
    </div>
  );
}

function useMonthHover(months: YearFlowMonth[], width: number, padL: number, padR: number) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const plotW = width - padL - padR;

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (months.length === 0) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const xSvg = ((event.clientX - rect.left) / Math.max(1, rect.width)) * width;
      const clamped = Math.min(width - padR, Math.max(padL, xSvg));
      const ratio = months.length === 1 ? 0 : (clamped - padL) / plotW;
      const index = Math.min(months.length - 1, Math.max(0, Math.round(ratio * (months.length - 1))));
      setHover({ index, clientX: event.clientX, clientY: event.clientY });
    },
    [months.length, padL, padR, plotW, width],
  );

  const onPointerLeave = useCallback(() => setHover(null), []);

  return { hover, onPointerMove, onPointerLeave, plotW };
}

function SeriesChart({
  title,
  months,
  actualKey,
  plannedKey,
  stroke,
  compact,
  height,
}: {
  title: string;
  months: YearFlowMonth[];
  actualKey: 'actualIncomeCents' | 'actualExpenseCents';
  plannedKey: 'plannedIncomeCents' | 'plannedExpenseCents';
  stroke: string;
  compact: boolean;
  height: number;
}) {
  const width = 720;
  const padL = compact ? 36 : 44;
  const padR = 10;
  const padT = compact ? 8 : 14;
  const padB = compact ? 22 : 28;
  const plotH = height - padT - padB;
  const actual = months.map((month) => month[actualKey]);
  const planned = months.map((month) => month[plannedKey]);
  const maxVal = Math.max(1, ...actual, ...planned);
  const yFor = (value: number) => padT + (1 - value / maxVal) * plotH;
  const { hover, onPointerMove, onPointerLeave, plotW } = useMonthHover(months, width, padL, padR);
  const actualPath = buildPath(actual, padL, plotW, yFor);
  const plannedPath = buildPath(planned, padL, plotW, yFor);
  const clipId = useId();

  return (
    <div className="relative min-w-0">
      <p className="mb-0.5 px-1 text-control font-medium text-fg-secondary">{title}</p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full touch-none"
        role="img"
        aria-label={`${title} : plan en pointillé, réalisé en trait plein`}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={padL} y={padT} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <line
          x1={padL}
          x2={width - padR}
          y1={padT + plotH}
          y2={padT + plotH}
          stroke="var(--border-subtle)"
          strokeWidth={1}
        />
        <text x={padL - 6} y={padT + 4} textAnchor="end" fill="var(--fg-muted)" fontSize={10}>
          {axisEuros(maxVal)}
        </text>
        <g clipPath={`url(#${clipId})`}>
          {plannedPath ? (
            <path
              d={plannedPath}
              fill="none"
              stroke={stroke}
              strokeWidth={2}
              strokeOpacity={0.35}
              strokeDasharray="5 4"
            />
          ) : null}
          {actualPath ? (
            <path d={actualPath} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" />
          ) : null}
        </g>
        {months.map((month, index) => {
          const x = xForIndex(index, months.length, padL, plotW);
          const label = monthLabel(months, index, compact);
          const showTick = !compact || index % 2 === 0 || index === months.length - 1;
          const active = hover?.index === index;
          return (
            <g key={month.yearMonth}>
              <circle
                cx={x}
                cy={yFor(actual[index]!)}
                r={active ? (compact ? 3.5 : 4) : compact ? 2.5 : 3}
                fill={stroke}
              />
              {showTick ? (
                <text x={x} y={height - 6} textAnchor="middle" fill="var(--fg-muted)" fontSize={9}>
                  {label}
                </text>
              ) : null}
            </g>
          );
        })}
        {hover ? (
          <line
            x1={xForIndex(hover.index, months.length, padL, plotW)}
            x2={xForIndex(hover.index, months.length, padL, plotW)}
            y1={padT}
            y2={padT + plotH}
            stroke="var(--fg-muted)"
            strokeOpacity={0.35}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        ) : null}
        <rect x={padL} y={padT} width={plotW} height={plotH} fill="transparent" className="cursor-crosshair" />
      </svg>
      {hover ? (
        <ChartTooltip
          hover={hover}
          label={fullMonthLabel(months[hover.index]!.yearMonth)}
          lines={[
            {
              text: `Réalisé ${formatCents(actual[hover.index]!)}`,
              className: 'mt-0.5 text-[11px] font-semibold tabular-nums text-fg-primary',
            },
            { text: `Plan ${formatCents(planned[hover.index]!)}` },
          ]}
        />
      ) : null}
    </div>
  );
}

function NetChart({ months, compact, height }: { months: YearFlowMonth[]; compact: boolean; height: number }) {
  const width = 720;
  const padL = compact ? 36 : 44;
  const padR = 10;
  const padT = compact ? 10 : 16;
  const padB = compact ? 22 : 28;
  const plotH = height - padT - padB;
  const midY = padT + plotH / 2;
  const actual = months.map((month) => month.actualNetCents ?? month.actualIncomeCents - month.actualExpenseCents);
  const planned = months.map((month) => month.plannedNetCents ?? month.plannedIncomeCents - month.plannedExpenseCents);
  const maxAbs = Math.max(1, ...actual.map(Math.abs), ...planned.map(Math.abs));
  const yFor = (value: number) => midY - (value / maxAbs) * (plotH / 2 - 4);
  const { hover, onPointerMove, onPointerLeave, plotW } = useMonthHover(months, width, padL, padR);
  const actualPath = buildPath(actual, padL, plotW, yFor);
  const plannedPath = buildPath(planned, padL, plotW, yFor);

  return (
    <div className="relative min-w-0">
      <p className="mb-0.5 px-1 text-control font-medium text-fg-secondary">Solde</p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full touch-none"
        role="img"
        aria-label="Solde : plan en pointillé, réalisé en trait plein"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <line x1={padL} x2={width - padR} y1={midY} y2={midY} stroke="var(--border-subtle)" strokeWidth={1} />
        <text x={padL - 6} y={padT + 4} textAnchor="end" fill="var(--fg-muted)" fontSize={10}>
          {axisEuros(maxAbs)}
        </text>
        <text x={padL - 6} y={midY + 3} textAnchor="end" fill="var(--fg-muted)" fontSize={10}>
          0
        </text>
        <text x={padL - 6} y={padT + plotH} textAnchor="end" fill="var(--fg-muted)" fontSize={10}>
          −{axisEuros(maxAbs)}
        </text>
        {plannedPath ? (
          <path
            d={plannedPath}
            fill="none"
            stroke="var(--fg-muted)"
            strokeWidth={2}
            strokeOpacity={0.45}
            strokeDasharray="5 4"
          />
        ) : null}
        {actualPath ? (
          <path d={actualPath} fill="none" stroke="var(--fg-primary)" strokeWidth={2.5} strokeLinejoin="round" />
        ) : null}
        {months.map((month, index) => {
          const x = xForIndex(index, months.length, padL, plotW);
          const label = monthLabel(months, index, compact);
          const showTick = !compact || index % 2 === 0 || index === months.length - 1;
          const active = hover?.index === index;
          return (
            <g key={month.yearMonth}>
              <circle
                cx={x}
                cy={yFor(actual[index]!)}
                r={active ? (compact ? 3.5 : 4) : compact ? 2.5 : 3}
                fill="var(--fg-primary)"
              />
              {showTick ? (
                <text x={x} y={height - 6} textAnchor="middle" fill="var(--fg-muted)" fontSize={9}>
                  {label}
                </text>
              ) : null}
            </g>
          );
        })}
        {hover ? (
          <line
            x1={xForIndex(hover.index, months.length, padL, plotW)}
            x2={xForIndex(hover.index, months.length, padL, plotW)}
            y1={padT}
            y2={padT + plotH}
            stroke="var(--fg-muted)"
            strokeOpacity={0.35}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        ) : null}
        <rect x={padL} y={padT} width={plotW} height={plotH} fill="transparent" className="cursor-crosshair" />
      </svg>
      {hover ? (
        <ChartTooltip
          hover={hover}
          label={fullMonthLabel(months[hover.index]!.yearMonth)}
          lines={[
            {
              text: `Réalisé ${formatCents(actual[hover.index]!)}`,
              className: 'mt-0.5 text-[11px] font-semibold tabular-nums text-fg-primary',
            },
            { text: `Plan ${formatCents(planned[hover.index]!)}` },
          ]}
        />
      ) : null}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-fg-muted">
      <span className="inline-flex items-center gap-1.5">
        <svg width="18" height="6" aria-hidden="true">
          <line x1="0" y1="3" x2="18" y2="3" stroke="var(--fg-muted)" strokeWidth={2} />
        </svg>
        Réalisé
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg width="18" height="6" aria-hidden="true">
          <line
            x1="0"
            y1="3"
            x2="18"
            y2="3"
            stroke="var(--fg-muted)"
            strokeWidth={2}
            strokeOpacity={0.55}
            strokeDasharray="3 2"
          />
        </svg>
        Plan
      </span>
    </div>
  );
}

/** Courbe unique (revenus ou dépenses) pour une catégorie. */
export function YearToneChart({ months, tone, title, compact = true, height = 140, stroke }: YearToneChartProps) {
  return (
    <SeriesChart
      title={title ?? (tone === 'income' ? 'Revenus' : 'Dépenses')}
      months={months}
      actualKey={tone === 'income' ? 'actualIncomeCents' : 'actualExpenseCents'}
      plannedKey={tone === 'income' ? 'plannedIncomeCents' : 'plannedExpenseCents'}
      stroke={stroke ?? (tone === 'income' ? 'var(--success)' : 'var(--accent)')}
      compact={compact}
      height={height}
    />
  );
}

export function YearFlowChart({ months, compact = false }: YearFlowChartProps) {
  if (compact) {
    return (
      <div className="flex flex-col gap-1">
        <div className="grid grid-cols-2 gap-2">
          <SeriesChart
            title="Revenus"
            months={months}
            actualKey="actualIncomeCents"
            plannedKey="plannedIncomeCents"
            stroke="var(--success)"
            compact
            height={110}
          />
          <SeriesChart
            title="Dépenses"
            months={months}
            actualKey="actualExpenseCents"
            plannedKey="plannedExpenseCents"
            stroke="var(--accent)"
            compact
            height={110}
          />
        </div>
        <NetChart months={months} compact height={128} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <SeriesChart
          title="Revenus"
          months={months}
          actualKey="actualIncomeCents"
          plannedKey="plannedIncomeCents"
          stroke="var(--success)"
          compact={false}
          height={168}
        />
        <SeriesChart
          title="Dépenses"
          months={months}
          actualKey="actualExpenseCents"
          plannedKey="plannedExpenseCents"
          stroke="var(--accent)"
          compact={false}
          height={168}
        />
      </div>
      <NetChart months={months} compact={false} height={220} />
      <Legend />
    </div>
  );
}
