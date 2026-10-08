import { cn } from '@utils';

import {
  FORECAST_PROGRESS_EDGE_MASK,
  FORECAST_PROGRESS_GRADIENT,
  forecastProgressBeyondBarClass,
  forecastProgressFillPercent,
  forecastProgressGradientWidth,
  isForecastBeyond,
  type BudgetTone,
} from './forecast-budget.utils';

type ForecastProgressTrackProps = {
  percent: number;
  remainingCents: number;
  tone: BudgetTone;
  /** Fond de ligne (clip) ou barre fine. */
  variant: 'background' | 'bar';
};

export function ForecastProgressTrack({
  percent,
  remainingCents,
  tone,
  variant,
}: ForecastProgressTrackProps) {
  const beyond = isForecastBeyond(percent, remainingCents);
  const fill = forecastProgressFillPercent(percent);
  const softEdge = !beyond && fill > 0 && fill < 100;

  if (variant === 'background') {
    // Dépassement : fond uni porté par la ligne (surface), pas de dégradé.
    if (beyond || fill <= 0) return null;

    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden"
        style={{
          width: `${fill}%`,
          ...(softEdge
            ? {
                maskImage: FORECAST_PROGRESS_EDGE_MASK,
                WebkitMaskImage: FORECAST_PROGRESS_EDGE_MASK,
              }
            : null),
        }}
      >
        <div
          className="h-full opacity-45 dark:opacity-50"
          style={{
            width: forecastProgressGradientWidth(fill),
            background: FORECAST_PROGRESS_GRADIENT,
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-page">
      {beyond ? (
        <div className={cn('h-full w-full rounded-full', forecastProgressBeyondBarClass(tone))} />
      ) : fill <= 0 ? null : (
        <div
          className="h-full overflow-hidden rounded-full"
          style={{
            width: `${fill}%`,
            ...(softEdge
              ? {
                  maskImage: FORECAST_PROGRESS_EDGE_MASK,
                  WebkitMaskImage: FORECAST_PROGRESS_EDGE_MASK,
                }
              : null),
          }}
        >
          <div
            className="h-full"
            style={{
              width: forecastProgressGradientWidth(fill),
              background: FORECAST_PROGRESS_GRADIENT,
            }}
          />
        </div>
      )}
    </div>
  );
}
