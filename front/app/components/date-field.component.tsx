import { useId, useRef, useState } from 'react';
import { fr } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';

import { POPOVER_PLACEMENT } from '@constants';
import { cn, formatIsoDateFr, parseIsoDateLocal, toIsoDateLocal, todayIsoLocal } from '@utils';

import { Icon } from './icon.component';
import { Popover } from './popover.component';

type DateFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Affiche une action « Aujourd’hui » dans le popup. */
  showToday?: boolean;
};

export function DateField({
  id,
  value,
  onChange,
  placeholder = 'Choisir une date',
  disabled = false,
  showToday = true,
}: DateFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selected = value ? (parseIsoDateLocal(value) ?? undefined) : undefined;

  const applyDate = (date: Date | undefined) => {
    if (!date) {
      onChange('');
      return;
    }
    onChange(toIsoDateLocal(date));
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex h-12 w-full cursor-pointer items-center gap-3 rounded-control border border-border bg-page px-3 text-left transition-colors hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-60 dark:bg-elevated',
          open && 'border-accent shadow-[var(--focus-ring)]',
        )}
      >
        <Icon name="calendar_month" className="text-icon-sm text-fg-muted" />
        <span className={cn('min-w-0 flex-1 truncate text-body', value ? 'text-fg-primary' : 'text-fg-muted')}>
          {value ? formatIsoDateFr(value, { weekday: 'short' }) : placeholder}
        </span>
      </button>

      <Popover
        isOpen={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        placement={POPOVER_PLACEMENT.bottomStart}
        matchAnchorWidth={false}
        label="Choisir une date"
      >
        <div className="date-field-calendar flex flex-col gap-2 p-1">
          <DayPicker
            mode="single"
            locale={fr}
            weekStartsOn={1}
            selected={selected}
            defaultMonth={selected ?? new Date()}
            onSelect={applyDate}
          />
          {showToday ? (
            <button
              type="button"
              className="h-9 cursor-pointer rounded-control text-control font-medium text-accent hover:bg-accent-tint"
              onClick={() => applyDate(parseIsoDateLocal(todayIsoLocal()) ?? new Date())}
            >
              Aujourd’hui
            </button>
          ) : null}
        </div>
      </Popover>
    </>
  );
}
