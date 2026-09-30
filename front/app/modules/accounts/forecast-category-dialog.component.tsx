import { Button, Dialog, Icon, IconButton, Typography } from '@components';
import { BUTTON_VARIANT, DIALOG_SIZE, ICON_BUTTON_VARIANT } from '@constants';
import type { ForecastLine } from '@app-types';
import { cn, formatCents } from '@utils';

import type { BudgetTone } from './forecast-budget.utils';

type ForecastCategoryDialogProps = {
  open: boolean;
  onClose: () => void;
  tone: BudgetTone;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  plannedCents: number;
  actualCents: number;
  consumptionPercent: number;
  overBudget: boolean;
  lines: ForecastLine[];
  onAddInstallment: () => void;
  onEditLine: (lineId: string) => void;
  onDeleteLine: (lineId: string) => void;
  busy?: boolean;
};

export function ForecastCategoryDialog({
  open,
  onClose,
  tone,
  categoryName,
  categoryIcon,
  categoryColor,
  plannedCents,
  actualCents,
  consumptionPercent,
  overBudget,
  lines,
  onAddInstallment,
  onEditLine,
  onDeleteLine,
  busy,
}: ForecastCategoryDialogProps) {
  const toneClass = tone === 'income' ? 'text-success-strong' : 'text-error';

  return (
    <Dialog isOpen={open} onClose={onClose} title={categoryName} icon="category" size={DIALOG_SIZE.default}>
      <div className="mt-3 flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-control border border-border-subtle bg-subtle/60 p-3">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
            style={{ backgroundColor: categoryColor }}
          >
            <Icon name={categoryIcon} className="text-[1.25rem]!" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-control text-fg-muted">
              Planifié <span className="font-semibold text-fg-primary">{formatCents(plannedCents)}</span>
              {' · '}
              Réalisé <span className={cn('font-semibold', toneClass)}>{formatCents(actualCents)}</span>
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-page">
                <div
                  className={cn(
                    'h-full rounded-full',
                    overBudget ? 'bg-error' : tone === 'income' ? 'bg-success-strong' : 'bg-accent',
                  )}
                  style={{ width: `${Math.min(100, consumptionPercent)}%` }}
                />
              </div>
              <span className={cn('shrink-0 text-[11px] tabular-nums', overBudget ? 'text-error' : 'text-fg-muted')}>
                {consumptionPercent}%
              </span>
            </div>
          </div>
        </div>

        <div>
          <Typography variant="body" className="mb-2 font-medium text-fg-secondary">
            Échéances ({lines.length})
          </Typography>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {lines.map((line) => (
              <li
                key={line.id}
                className="flex items-center gap-2 rounded-control border border-border-subtle bg-page/80 px-2.5 py-2 dark:bg-page/30"
              >
                <span className="inline-flex min-w-[3rem] justify-center rounded-full bg-subtle px-2 py-0.5 text-[11px] font-medium tabular-nums text-fg-muted">
                  {line.scheduledDay !== null ? `J${line.scheduledDay}` : '—'}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onEditLine(line.id)}
                  className="min-w-0 flex-1 cursor-pointer text-left text-control font-semibold tabular-nums text-fg-primary hover:text-accent"
                >
                  {formatCents(line.plannedAmountCents)}
                </button>
                <IconButton
                  variant={ICON_BUTTON_VARIANT.ghost}
                  icon="edit"
                  aria-label="Modifier l'échéance"
                  disabled={busy}
                  onClick={() => onEditLine(line.id)}
                />
                <IconButton
                  variant={ICON_BUTTON_VARIANT.ghost}
                  icon="delete"
                  aria-label="Supprimer l'échéance"
                  disabled={busy}
                  onClick={() => onDeleteLine(line.id)}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-3">
          <Button
            type="button"
            variant={BUTTON_VARIANT.secondary}
            fullWidth={false}
            className="w-auto px-3"
            disabled={busy}
            onClick={onAddInstallment}
          >
            <Icon name="add" className="text-icon-sm" />
            Nouvelle échéance
          </Button>
          <Button
            type="button"
            variant={BUTTON_VARIANT.neutral}
            fullWidth={false}
            className="ms-auto w-auto px-3"
            onClick={onClose}
          >
            Fermer
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
