import { useState } from 'react';

import { Dialog, Icon } from '@components';
import { cn } from '@utils';

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

type MonthDayPickerProps = {
  value: number | null;
  onChange: (day: number | null) => void;
  daysInMonth?: number;
  className?: string;
  emptyLabel?: string;
  /** `button` ouvre un dialog ; `inline` affiche la grille dans le formulaire. */
  variant?: 'button' | 'inline';
};

function MonthDayGrid({
  value,
  maxDay,
  onPick,
  compact,
}: {
  value: number | null;
  maxDay: number;
  onPick: (day: number | null) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => onPick(null)}
        className={cn(
          'flex cursor-pointer items-center gap-2 rounded-control border px-2.5 py-2 text-left text-control transition-colors',
          value === null
            ? 'border-accent bg-accent-tint text-accent-press'
            : 'border-border-subtle bg-page text-fg-muted hover:border-border hover:text-fg-secondary dark:bg-elevated',
          compact && 'py-1.5 text-[11px]',
        )}
      >
        <Icon name="all_inclusive" className={cn(compact ? 'text-[1rem]!' : 'text-[1.1rem]!')} />
        <span className="font-medium">Flexible</span>
      </button>

      <div
        className={cn('rounded-control border border-border-subtle bg-page p-2 dark:bg-elevated', compact && 'p-1.5')}
      >
        <div className={cn('grid grid-cols-7 gap-1', compact && 'gap-0.5')}>
          {DAYS.filter((day) => day <= maxDay).map((day) => {
            const active = value === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => onPick(day)}
                className={cn(
                  'flex aspect-square cursor-pointer items-center justify-center rounded-full font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
                  compact ? 'text-[11px]' : 'text-[13px]',
                  active
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-fg-secondary hover:bg-accent-tint hover:text-accent-press',
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function MonthDayPicker({
  value,
  onChange,
  daysInMonth = 31,
  className,
  emptyLabel = 'Jour',
  variant = 'button',
}: MonthDayPickerProps) {
  const [open, setOpen] = useState(false);
  const maxDay = Math.min(31, Math.max(28, daysInMonth));

  const pick = (day: number | null) => {
    onChange(day);
    setOpen(false);
  };

  if (variant === 'inline') {
    return (
      <div className={cn('flex h-full min-h-0 flex-col', className)}>
        <MonthDayGrid value={value} maxDay={maxDay} onPick={onChange} compact />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex h-12 shrink-0 cursor-pointer items-center gap-1.5 rounded-control border px-3 text-control font-medium transition-colors duration-(--duration-fast) hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          value === null
            ? 'border-border bg-page text-fg-muted dark:bg-elevated'
            : 'border-accent/30 bg-accent-tint text-accent-press',
          className,
        )}
      >
        <Icon name="calendar_today" className="text-[1.1rem]!" />
        <span className="tabular-nums">{value === null ? emptyLabel : `Le ${value}`}</span>
      </button>

      <Dialog isOpen={open} onClose={() => setOpen(false)} title="Jour d’échéance" icon="calendar_month">
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-control text-fg-muted">Optionnel — utile pour la timeline. Deux dates = deux lignes.</p>
          <MonthDayGrid value={value} maxDay={maxDay} onPick={pick} />
        </div>
      </Dialog>
    </>
  );
}
