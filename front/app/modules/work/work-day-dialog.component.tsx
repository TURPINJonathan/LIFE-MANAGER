import { Button, Dialog, FormField, Icon, IconButton } from '@components';
import { BUTTON_VARIANT, DIALOG_SIZE, FIELD_CONTROL_CLASSES, ICON_BUTTON_VARIANT } from '@constants';
import type { TimeSegmentInput, TimeShortcut } from '@app-types';
import { cn, formatIsoDateFr } from '@utils';

import { formatMinutes } from './work.utils';

export type DayLaneDraft = {
  segments: TimeSegmentInput[];
  pauseMinutes: number;
  notes: string;
  existingId: string | null;
};

type WorkDayDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  workDate: string;
  planned: DayLaneDraft;
  actual: DayLaneDraft;
  shortcuts: TimeShortcut[];
  timeTrackingEnabled: boolean;
  busy?: boolean;
  activeLane: 'planned' | 'actual';
  onActiveLaneChange: (lane: 'planned' | 'actual') => void;
  onChangePlanned: (next: DayLaneDraft) => void;
  onChangeActual: (next: DayLaneDraft) => void;
  onCopyPlannedToActual: () => void;
  onSave: () => void;
  onDelete: () => void;
};

function emptySegment(): TimeSegmentInput {
  return { start: '08:00', end: '12:00' };
}

function segmentSpanMinutes(segments: TimeSegmentInput[], pauseMinutes: number): number {
  let gross = 0;
  for (const seg of segments) {
    const [sh, sm] = seg.start.split(':').map(Number);
    const [eh, em] = seg.end.split(':').map(Number);
    const start = sh * 60 + sm;
    let end = eh * 60 + em;
    if (end === 0 && start > 0) end = 24 * 60;
    gross += Math.max(0, end - start);
  }
  return Math.max(0, gross - pauseMinutes);
}

function LaneEditor({
  draft,
  onChange,
  shortcuts,
  showShortcuts,
}: {
  draft: DayLaneDraft;
  onChange: (next: DayLaneDraft) => void;
  shortcuts: TimeShortcut[];
  showShortcuts: boolean;
}) {
  const segments = draft.segments.length > 0 ? draft.segments : [emptySegment()];

  return (
    <div className="flex flex-col gap-3">
      {showShortcuts && shortcuts.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {shortcuts.map((shortcut) => (
            <button
              key={shortcut.id}
              type="button"
              onClick={() =>
                onChange({
                  ...draft,
                  segments: shortcut.segments.map((s) => ({ ...s })),
                  pauseMinutes: shortcut.pauseMinutes,
                })
              }
              className="inline-flex cursor-pointer items-center gap-1 rounded-control border border-border-subtle bg-subtle px-2.5 py-1.5 text-control text-fg-secondary transition hover:border-accent hover:bg-accent-tint hover:text-accent-press"
            >
              <Icon name="bolt" className="text-icon-sm" />
              {shortcut.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 rounded-control border border-border-subtle bg-page p-3 dark:bg-elevated">
        {segments.map((segment, index) => (
          <div key={index} className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2">
            <FormField label={index === 0 ? 'Début' : undefined} htmlFor={`lane-start-${index}`}>
              <input
                id={`lane-start-${index}`}
                type="time"
                className={FIELD_CONTROL_CLASSES}
                value={segment.start}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    segments: segments.map((s, i) => (i === index ? { ...s, start: e.target.value } : s)),
                  })
                }
              />
            </FormField>
            <span className="mb-2.5 text-fg-muted">→</span>
            <FormField label={index === 0 ? 'Fin' : undefined} htmlFor={`lane-end-${index}`}>
              <input
                id={`lane-end-${index}`}
                type="time"
                className={FIELD_CONTROL_CLASSES}
                value={segment.end}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    segments: segments.map((s, i) => (i === index ? { ...s, end: e.target.value } : s)),
                  })
                }
              />
            </FormField>
            <IconButton
              variant={ICON_BUTTON_VARIANT.ghost}
              icon="close"
              aria-label="Retirer le créneau"
              className="mb-0.5"
              disabled={segments.length <= 1}
              onClick={() =>
                onChange({
                  ...draft,
                  segments: segments.filter((_, i) => i !== index),
                })
              }
            />
          </div>
        ))}
        <Button
          type="button"
          variant={BUTTON_VARIANT.ghost}
          fullWidth={false}
          className="h-9 w-auto self-start px-2"
          onClick={() => onChange({ ...draft, segments: [...segments, emptySegment()] })}
        >
          <Icon name="add" className="text-icon-sm" />
          Créneau
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Pause (min)" htmlFor="lane-pause">
          <input
            id="lane-pause"
            type="number"
            min={0}
            className={FIELD_CONTROL_CLASSES}
            value={draft.pauseMinutes}
            onChange={(e) => onChange({ ...draft, pauseMinutes: Number(e.target.value) || 0 })}
          />
        </FormField>
        <FormField label="Notes" htmlFor="lane-notes">
          <input
            id="lane-notes"
            className={FIELD_CONTROL_CLASSES}
            value={draft.notes}
            onChange={(e) => onChange({ ...draft, notes: e.target.value })}
            placeholder="Optionnel"
          />
        </FormField>
      </div>

      <p className="text-control tabular-nums text-fg-secondary">
        Total :{' '}
        <strong className="text-fg-primary">{formatMinutes(segmentSpanMinutes(segments, draft.pauseMinutes))}</strong>
      </p>
    </div>
  );
}

export function WorkDayDialog({
  isOpen,
  onClose,
  workDate,
  planned,
  actual,
  shortcuts,
  timeTrackingEnabled,
  busy = false,
  activeLane,
  onActiveLaneChange,
  onChangePlanned,
  onChangeActual,
  onCopyPlannedToActual,
  onSave,
  onDelete,
}: WorkDayDialogProps) {
  const canDelete = activeLane === 'planned' ? Boolean(planned.existingId) : Boolean(actual.existingId);
  const canCopyPlanned = timeTrackingEnabled && Boolean(planned.existingId);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Journée" icon="schedule" size={DIALOG_SIZE.large}>
      <div className="mt-2 flex flex-col gap-4">
        <p className="text-control text-fg-muted">{formatIsoDateFr(workDate, { weekday: 'long' })}</p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onActiveLaneChange('planned')}
            className={cn(
              'rounded-control border px-3 py-2 text-left transition',
              activeLane === 'planned'
                ? 'border-accent bg-accent-tint'
                : 'border-border-subtle bg-page hover:bg-subtle dark:bg-elevated',
            )}
          >
            <p className="text-[11px] text-fg-muted">Prévu</p>
            <p className="font-semibold tabular-nums">
              {planned.existingId ? formatMinutes(segmentSpanMinutes(planned.segments, planned.pauseMinutes)) : '—'}
            </p>
          </button>
          <button
            type="button"
            disabled={!timeTrackingEnabled}
            onClick={() => onActiveLaneChange('actual')}
            className={cn(
              'rounded-control border px-3 py-2 text-left transition',
              !timeTrackingEnabled && 'cursor-not-allowed opacity-50',
              activeLane === 'actual'
                ? 'border-accent bg-accent-tint'
                : 'border-border-subtle bg-page hover:bg-subtle dark:bg-elevated',
            )}
          >
            <p className="text-[11px] text-fg-muted">Réel</p>
            <p className="font-semibold tabular-nums">
              {actual.existingId ? formatMinutes(segmentSpanMinutes(actual.segments, actual.pauseMinutes)) : '—'}
            </p>
          </button>
        </div>

        {timeTrackingEnabled ? (
          <Button
            type="button"
            variant={BUTTON_VARIANT.neutral}
            fullWidth={false}
            className="h-9 w-auto self-start px-2.5"
            disabled={busy || !canCopyPlanned}
            onClick={onCopyPlannedToActual}
          >
            <Icon name="content_copy" className="text-icon-sm" />
            Copier le prévu → réel
          </Button>
        ) : null}

        {activeLane === 'planned' ? (
          <LaneEditor draft={planned} onChange={onChangePlanned} shortcuts={shortcuts} showShortcuts />
        ) : (
          <LaneEditor draft={actual} onChange={onChangeActual} shortcuts={shortcuts} showShortcuts />
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          {canDelete ? (
            <Button
              type="button"
              variant={BUTTON_VARIANT.dangerOutline}
              fullWidth={false}
              className="me-auto w-auto px-3"
              disabled={busy}
              onClick={onDelete}
            >
              Supprimer
            </Button>
          ) : null}
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

export { emptySegment, segmentSpanMinutes };
