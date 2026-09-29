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
};

export function MonthDayPicker({
  value,
  onChange,
  daysInMonth = 31,
  className,
  emptyLabel = 'Jour',
}: MonthDayPickerProps) {
  const [open, setOpen] = useState(false);
  const maxDay = Math.min(31, Math.max(28, daysInMonth));

  const pick = (day: number | null) => {
    onChange(day);
    setOpen(false);
  };

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

          <button
            type="button"
            onClick={() => pick(null)}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
              value === null
                ? 'border-accent bg-accent-tint text-accent-press'
                : 'border-border-subtle bg-page text-fg-secondary hover:border-border hover:text-fg-primary dark:bg-elevated',
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-subtle">
              <Icon name="all_inclusive" className="text-[1.25rem]!" />
            </span>
            <span>
              <span className="block text-body font-semibold">Flexible</span>
              <span className="block text-control text-fg-muted">Sans jour précis</span>
            </span>
          </button>

          <div className="rounded-xl border border-border-subtle bg-page p-3 dark:bg-elevated">
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS.filter((day) => day <= maxDay).map((day) => {
                const active = value === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => pick(day)}
                    className={cn(
                      'flex aspect-square cursor-pointer items-center justify-center rounded-full text-[13px] font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
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
      </Dialog>
    </>
  );
}
