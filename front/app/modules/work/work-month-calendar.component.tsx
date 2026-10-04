import { cn, formatIsoDateFr, todayIsoLocal } from '@utils';

import { formatMinutes } from './work.utils';

export type WorkCalendarDay = {
  workDate: string;
  plannedMinutes: number;
  actualMinutes: number;
};

type WorkMonthCalendarProps = {
  yearMonth: string;
  days: WorkCalendarDay[];
  /** PHP-style : 0 = dimanche … 6 = samedi (défaut 1 = lundi). */
  weekStartsOn?: number;
  /** Bit 0 = lundi … bit 6 = dimanche. */
  workDaysMask?: number;
  selectedDate?: string | null;
  onSelectDay: (workDate: string) => void;
};

const LABELS_FROM_MONDAY = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** 0 = lundi … 6 = dimanche. */
function mondayBasedIndex(phpDow: number): number {
  return phpDow === 0 ? 6 : phpDow - 1;
}

function buildCells(yearMonth: string, weekStartsOnPhp: number): Array<string | null> {
  const [y, m] = yearMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const startBit = mondayBasedIndex(weekStartsOnPhp);
  const firstBit = mondayBasedIndex(first.getDay());
  const offset = (firstBit - startBit + 7) % 7;
  const cells: Array<string | null> = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${yearMonth}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isWorkDayIso(iso: string, workDaysMask: number): boolean {
  const [y, m, d] = iso.split('-').map(Number);
  const phpDow = new Date(y, m - 1, d).getDay();
  const bit = mondayBasedIndex(phpDow);
  return (workDaysMask & (1 << bit)) !== 0;
}

export function WorkMonthCalendar({
  yearMonth,
  days,
  weekStartsOn = 1,
  workDaysMask = 31,
  selectedDate,
  onSelectDay,
}: WorkMonthCalendarProps) {
  const byDate = new Map(days.map((d) => [d.workDate, d]));
  const startBit = mondayBasedIndex(weekStartsOn);
  const labels = [...LABELS_FROM_MONDAY.slice(startBit), ...LABELS_FROM_MONDAY.slice(0, startBit)];
  const cells = buildCells(yearMonth, weekStartsOn);
  const today = todayIsoLocal();

  return (
    <div className="rounded-panel border border-border-subtle bg-elevated p-3">
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-3 text-[11px] text-fg-muted">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block size-2 rounded-sm bg-accent-outline/70" />
            Prévu
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block size-2 rounded-sm bg-accent" />
            Réel
          </span>
        </div>
      </div>
      <div className="mb-2 grid grid-cols-7 gap-1">
        {labels.map((label, i) => (
          <div key={`${label}-${i}`} className="py-1 text-center text-[11px] font-semibold text-fg-muted">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((iso, index) => {
          if (!iso) {
            return <div key={`e-${index}`} className="min-h-[4.5rem]" />;
          }
          const data = byDate.get(iso);
          const planned = data?.plannedMinutes ?? 0;
          const actual = data?.actualMinutes ?? 0;
          const workDay = isWorkDayIso(iso, workDaysMask);
          const hasData = planned > 0 || actual > 0;
          const selected = selectedDate === iso;
          const isToday = iso === today;
          const dayNum = Number(iso.slice(-2));

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDay(iso)}
              title={formatIsoDateFr(iso, { weekday: 'long' })}
              className={cn(
                'relative flex min-h-[4.5rem] cursor-pointer flex-col items-stretch rounded-control border px-1 py-1.5 text-left transition',
                selected
                  ? 'border-accent bg-accent text-white shadow-sm'
                  : hasData
                    ? 'border-accent/30 bg-accent-tint/40 text-fg-primary hover:border-accent'
                    : workDay
                      ? 'border-transparent bg-page text-fg-secondary hover:bg-subtle dark:bg-elevated/60'
                      : 'border-transparent bg-subtle/40 text-fg-muted/70 hover:bg-subtle',
                isToday && !selected && 'ring-2 ring-accent/40 ring-offset-1 ring-offset-elevated',
              )}
            >
              <span
                className={cn(
                  'text-[13px] font-semibold tabular-nums',
                  selected ? 'text-white' : !workDay && 'opacity-60',
                )}
              >
                {dayNum}
              </span>
              <div className="mt-auto flex flex-col gap-0.5 pt-1">
                <span
                  className={cn(
                    'truncate rounded-sm px-1 py-0.5 text-[9px] leading-none tabular-nums',
                    selected
                      ? 'bg-white/20 text-white'
                      : planned > 0
                        ? 'bg-accent-outline/20 text-fg-secondary'
                        : 'text-fg-muted/50',
                  )}
                >
                  {planned > 0 ? formatMinutes(planned) : '—'}
                </span>
                <span
                  className={cn(
                    'truncate rounded-sm px-1 py-0.5 text-[9px] leading-none tabular-nums',
                    selected
                      ? 'bg-white/30 text-white'
                      : actual > 0
                        ? 'bg-accent/15 font-medium text-accent-press'
                        : 'text-fg-muted/50',
                  )}
                >
                  {actual > 0 ? formatMinutes(actual) : '—'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-fg-muted">Touchez un jour pour saisir le prévu et/ou le réel.</p>
    </div>
  );
}
