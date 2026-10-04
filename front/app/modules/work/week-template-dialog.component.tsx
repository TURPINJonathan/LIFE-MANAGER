import { Button, Dialog, FormField, Icon, IconButton } from '@components';
import { BUTTON_VARIANT, DIALOG_SIZE, FIELD_CONTROL_CLASSES, ICON_BUTTON_VARIANT } from '@constants';
import type { TimeSegmentInput, WeekTemplate, WeekTemplateDay } from '@app-types';
import { cn } from '@utils';

import { DEFAULT_DAY_SHORTCUT, formatMinutes } from './work.utils';
import { emptySegment, segmentSpanMinutes } from './work-day-dialog.component';

const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;

type WeekTemplateDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  value: WeekTemplate;
  busy?: boolean;
  onChange: (next: WeekTemplate) => void;
  onSave: () => void;
};

export function defaultWeekTemplate(workDaysMask = 31): WeekTemplate {
  const day = (): WeekTemplateDay => ({
    enabled: true,
    segments: DEFAULT_DAY_SHORTCUT.segments.map((s) => ({ ...s })),
    pauseMinutes: DEFAULT_DAY_SHORTCUT.pauseMinutes,
  });
  const off = (): WeekTemplateDay => ({
    enabled: false,
    segments: [],
    pauseMinutes: 0,
  });

  return [0, 1, 2, 3, 4, 5, 6].map((bit) => (workDaysMask & (1 << bit) ? day() : off())) as WeekTemplate;
}

function updateDay(template: WeekTemplate, index: number, patch: Partial<WeekTemplateDay>): WeekTemplate {
  return template.map((day, i) => {
    if (i !== index) return day;
    const next = { ...day, ...patch };
    if (next.enabled && next.segments.length === 0) {
      next.segments = DEFAULT_DAY_SHORTCUT.segments.map((s) => ({ ...s }));
      next.pauseMinutes = DEFAULT_DAY_SHORTCUT.pauseMinutes;
    }
    return next;
  }) as WeekTemplate;
}

export function WeekTemplateDialog({
  isOpen,
  onClose,
  value,
  busy = false,
  onChange,
  onSave,
}: WeekTemplateDialogProps) {
  const weeklyMinutes = value.reduce(
    (sum, day) => sum + (day.enabled ? segmentSpanMinutes(day.segments, day.pauseMinutes) : 0),
    0,
  );

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Semaine type" icon="date_range" size={DIALOG_SIZE.large}>
      <div className="mt-2 flex flex-col gap-4">
        <p className="text-control text-fg-muted">
          Définissez les jours et horaires habituels. « Remplir le mois » reprendra cette semaine.
        </p>
        <p className="text-control tabular-nums text-fg-secondary">
          Total hebdo : <strong className="text-fg-primary">{formatMinutes(weeklyMinutes)}</strong>
        </p>

        <ul className="flex max-h-[min(60vh,28rem)] flex-col gap-2 overflow-y-auto pe-1">
          {value.map((day, index) => (
            <li
              key={DAY_LABELS[index]}
              className={cn(
                'rounded-control border p-3',
                day.enabled ? 'border-border-subtle bg-page dark:bg-elevated' : 'border-transparent bg-subtle/50',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(e) => onChange(updateDay(value, index, { enabled: e.target.checked }))}
                    className="size-4 accent-[var(--accent)]"
                  />
                  <span className="font-medium text-fg-primary">{DAY_LABELS[index]}</span>
                </label>
                {day.enabled ? (
                  <span className="text-control tabular-nums text-fg-muted">
                    {formatMinutes(segmentSpanMinutes(day.segments, day.pauseMinutes))}
                  </span>
                ) : (
                  <span className="text-control text-fg-muted">Repos</span>
                )}
              </div>

              {day.enabled ? (
                <div className="mt-3 flex flex-col gap-2">
                  {(day.segments.length > 0 ? day.segments : [emptySegment()]).map((segment, segIndex) => {
                    const segments = day.segments.length > 0 ? day.segments : [emptySegment()];
                    return (
                      <div key={segIndex} className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2">
                        <FormField label={segIndex === 0 ? 'Début' : undefined} htmlFor={`wt-${index}-s-${segIndex}`}>
                          <input
                            id={`wt-${index}-s-${segIndex}`}
                            type="time"
                            className={FIELD_CONTROL_CLASSES}
                            value={segment.start}
                            onChange={(e) => {
                              const nextSegs: TimeSegmentInput[] = segments.map((s, i) =>
                                i === segIndex ? { ...s, start: e.target.value } : s,
                              );
                              onChange(updateDay(value, index, { segments: nextSegs }));
                            }}
                          />
                        </FormField>
                        <span className="mb-2.5 text-fg-muted">→</span>
                        <FormField label={segIndex === 0 ? 'Fin' : undefined} htmlFor={`wt-${index}-e-${segIndex}`}>
                          <input
                            id={`wt-${index}-e-${segIndex}`}
                            type="time"
                            className={FIELD_CONTROL_CLASSES}
                            value={segment.end}
                            onChange={(e) => {
                              const nextSegs: TimeSegmentInput[] = segments.map((s, i) =>
                                i === segIndex ? { ...s, end: e.target.value } : s,
                              );
                              onChange(updateDay(value, index, { segments: nextSegs }));
                            }}
                          />
                        </FormField>
                        <IconButton
                          variant={ICON_BUTTON_VARIANT.ghost}
                          icon="close"
                          aria-label="Retirer"
                          className="mb-0.5"
                          disabled={segments.length <= 1}
                          onClick={() =>
                            onChange(
                              updateDay(value, index, {
                                segments: segments.filter((_, i) => i !== segIndex),
                              }),
                            )
                          }
                        />
                      </div>
                    );
                  })}
                  <div className="flex flex-wrap items-end gap-2">
                    <FormField label="Pause (min)" htmlFor={`wt-pause-${index}`} className="w-28">
                      <input
                        id={`wt-pause-${index}`}
                        type="number"
                        min={0}
                        className={FIELD_CONTROL_CLASSES}
                        value={day.pauseMinutes}
                        onChange={(e) =>
                          onChange(
                            updateDay(value, index, {
                              pauseMinutes: Number(e.target.value) || 0,
                            }),
                          )
                        }
                      />
                    </FormField>
                    <Button
                      type="button"
                      variant={BUTTON_VARIANT.ghost}
                      fullWidth={false}
                      className="h-11 w-auto px-2"
                      onClick={() =>
                        onChange(
                          updateDay(value, index, {
                            segments: [...(day.segments.length > 0 ? day.segments : [emptySegment()]), emptySegment()],
                          }),
                        )
                      }
                    >
                      <Icon name="add" className="text-icon-sm" />
                      Créneau
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant={BUTTON_VARIANT.dangerOutline}
            fullWidth={false}
            className="w-auto px-3"
            disabled={busy}
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant={BUTTON_VARIANT.success}
            fullWidth={false}
            className="w-auto px-4"
            loading={busy}
            onClick={onSave}
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
