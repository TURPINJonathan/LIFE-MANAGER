import type {
  Category,
  CategoryKind,
  ForecastLine,
  ForecastLineInput,
  ForecastStatsCategory,
  ForecastStatsPreviousCategory,
  SelectOption,
} from '@app-types';
import { Icon } from '@components';
import { formatCents } from '@utils';

import { buildCategorySelectOptions } from './category-select-options';

export type BudgetTone = 'income' | 'expense';

function byNameFr(a: Category, b: Category): number {
  return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
}

export function defaultFlowForTone(tone: BudgetTone): 'credit' | 'debit' {
  return tone === 'income' ? 'credit' : 'debit';
}

export function categoryMatchesTone(category: Category, tone: BudgetTone, flow: 'credit' | 'debit' | null): boolean {
  if (category.kind === 'expense') return tone === 'expense';
  if (category.kind === 'income') return tone === 'income';
  const effective = flow ?? defaultFlowForTone(tone);
  return tone === 'income' ? effective === 'credit' : effective === 'debit';
}

export function filterCategoriesForTone(categories: Category[], tone: BudgetTone): Category[] {
  return categories.filter((item) => {
    if (item.kind === 'expense') return tone === 'expense';
    if (item.kind === 'income') return tone === 'income';
    return true;
  });
}

export function defaultCategoryIdForTone(categories: Category[], tone: BudgetTone): string {
  const filtered = filterCategoriesForTone(categories, tone).sort(byNameFr);
  return filtered[0]?.id ?? '';
}

export function previousMonthKey(categoryId: string, flow: 'credit' | 'debit' | null | undefined): string {
  return `${categoryId}:${flow ?? ''}`;
}

/** Montant indicatif M−1 : planifié si > 0, sinon réalisé. */
export function preferredPreviousCents(row: ForecastStatsPreviousCategory): number {
  if (row.previousPlannedAmountCents > 0) return row.previousPlannedAmountCents;
  return row.previousActualAmountCents;
}

export function lookupPreviousCategory(
  previousByKey: Map<string, ForecastStatsPreviousCategory>,
  categoryId: string,
  flow: 'credit' | 'debit' | null,
): ForecastStatsPreviousCategory | undefined {
  return previousByKey.get(previousMonthKey(categoryId, flow)) ?? previousByKey.get(previousMonthKey(categoryId, null));
}

function previousAmountTrailing(row: ForecastStatsPreviousCategory, previousMonthLabel: string) {
  const planned = row.previousPlannedAmountCents;
  const actual = row.previousActualAmountCents;
  if (planned <= 0 && actual <= 0) return undefined;

  return (
    <span
      className="inline-flex shrink-0 items-center gap-2 text-[11px] font-medium tabular-nums text-fg-muted"
      title={`${previousMonthLabel} — réalisé ${formatCents(actual)} · budget ${formatCents(planned)}`}
    >
      <span
        className="inline-flex items-center gap-0.5 text-fg-secondary"
        aria-label={`Réalisé ${formatCents(actual)}`}
      >
        <Icon name="payments" className="text-[13px]!" />
        {formatCents(actual)}
      </span>
      <span className="inline-flex items-center gap-0.5" aria-label={`Budget ${formatCents(planned)}`}>
        <Icon name="calendar_month" className="text-[13px]!" />
        {formatCents(planned)}
      </span>
    </span>
  );
}

export function buildCategorySelectOptionsForTone(
  categories: Category[],
  tone: BudgetTone,
  previousByKey?: Map<string, ForecastStatsPreviousCategory>,
  previousMonthLabel?: string,
  preferredFlow?: 'credit' | 'debit',
): SelectOption[] {
  const all = buildCategorySelectOptions(categories);
  const allowed = new Set(filterCategoriesForTone(categories, tone).map((item) => item.id));
  const options: SelectOption[] = [];
  for (const option of all) {
    if (option.heading) {
      options.push(option);
      continue;
    }
    if (!allowed.has(option.value)) continue;

    const category = categories.find((item) => item.id === option.value);
    let trailing = option.trailing;
    if (previousByKey && previousMonthLabel && category) {
      const flow = category.kind === 'both' ? (preferredFlow ?? defaultFlowForTone(tone)) : null;
      const previous = lookupPreviousCategory(previousByKey, category.id, flow);
      if (previous) {
        trailing = previousAmountTrailing(previous, previousMonthLabel) ?? trailing;
      }
    }

    options.push(trailing ? { ...option, trailing } : option);
  }
  return options.filter((option, index, list) => {
    if (!option.heading) return true;
    const next = list[index + 1];
    return next !== undefined && !next.heading;
  });
}

export function lineGroupKey(categoryId: string, flow: 'credit' | 'debit' | null | undefined): string {
  return `${categoryId}:${flow ?? ''}`;
}

export function forecastLineToInput(line: ForecastLine): ForecastLineInput {
  return {
    categoryId: line.categoryId,
    plannedAmountCents: line.plannedAmountCents,
    flow: line.categoryKind === 'both' ? line.flow : null,
    scheduledDay: line.scheduledDay,
  };
}

export function forecastToLineInputs(lines: ForecastLine[]): ForecastLineInput[] {
  return lines.map(forecastLineToInput);
}

export function linesForCategoryGroup(
  lines: ForecastLine[],
  categoryId: string,
  flow: 'credit' | 'debit' | null,
): ForecastLine[] {
  return lines
    .filter((line) => {
      if (line.categoryId !== categoryId) return false;
      const lineFlow = line.categoryKind === 'both' ? line.flow : null;
      return (lineFlow ?? null) === (flow ?? null);
    })
    .sort((a, b) => (a.scheduledDay ?? 32) - (b.scheduledDay ?? 32) || a.position - b.position);
}

export function isExpenseStatsRow(
  row: Pick<ForecastStatsCategory, 'plannedSignedCents' | 'categoryKind' | 'flow'>,
): boolean {
  if (row.plannedSignedCents < 0) return true;
  if (row.plannedSignedCents > 0) return false;
  if (row.categoryKind === 'expense') return true;
  if (row.categoryKind === 'income') return false;
  return row.flow === 'debit';
}

export function flowForStatsRow(row: Pick<ForecastStatsCategory, 'categoryKind' | 'flow'>): 'credit' | 'debit' | null {
  if (row.categoryKind === 'both') return row.flow;
  return null;
}

export function kindLabel(kind: CategoryKind): string {
  if (kind === 'expense') return 'Sortie';
  if (kind === 'income') return 'Entrée';
  return 'Mixte';
}

/** Dégradé d’avancement : rouge → orange → jaune → vert (0 → 100 %). Pas utilisé en dépassement. */
export const FORECAST_PROGRESS_GRADIENT =
  'linear-gradient(to right, var(--error), var(--warning-strong), var(--warning), var(--success))';

/** Adoucit le bord droit de la jauge en cours (évite la coupe nette). */
export const FORECAST_PROGRESS_EDGE_MASK =
  'linear-gradient(to right, #000 0%, #000 calc(100% - 1.25rem), transparent 100%)';

export function forecastProgressFillPercent(percent: number): number {
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  return Math.min(100, percent);
}

/** Largeur de la couche gradient pour que le clip montre la portion [0, fill] du spectre. */
export function forecastProgressGradientWidth(fillPercent: number): string {
  if (fillPercent <= 0) return '100%';
  return `${(100 / fillPercent) * 100}%`;
}

/**
 * Au-delà de l’objectif : reste négatif (ex. planifié 0 € + réalisé)
 * ou pourcentage strictement > 100.
 */
export function isForecastBeyond(percent: number, remainingCents: number): boolean {
  return remainingCents < 0 || percent > 100;
}

export function forecastProgressBeyondBarClass(tone: BudgetTone): string {
  return tone === 'expense' ? 'bg-error' : 'bg-success';
}

/** Surface de ligne : dépassement = fond uni saturé ; sinon piste neutre + dégradé en overlay. */
export function forecastProgressRowSurfaceClass(
  percent: number,
  remainingCents: number,
  tone: BudgetTone,
): string {
  if (isForecastBeyond(percent, remainingCents)) {
    return tone === 'expense'
      ? 'border-2 border-error bg-error/25 dark:bg-error/30'
      : 'border-2 border-success bg-success/25 dark:bg-success/30';
  }
  return 'border border-border-subtle bg-page/70 hover:border-accent/40 hover:bg-accent-tint/20 dark:bg-page/20 dark:hover:bg-page/35';
}

/** Tri : dépassements → 0 % → en cours (croissant) → 100 %, puis nom. */
export function compareForecastProgress(
  a: { consumptionPercent: number; remainingCents: number; categoryName: string },
  b: { consumptionPercent: number; remainingCents: number; categoryName: string },
): number {
  const bucket = (percent: number, remainingCents: number): number => {
    if (isForecastBeyond(percent, remainingCents)) return 0;
    if (percent <= 0) return 1;
    if (percent < 100) return 2;
    return 3;
  };

  const bucketA = bucket(a.consumptionPercent, a.remainingCents);
  const bucketB = bucket(b.consumptionPercent, b.remainingCents);
  if (bucketA !== bucketB) return bucketA - bucketB;

  if (bucketA === 0) {
    const diff = a.remainingCents - b.remainingCents;
    if (diff !== 0) return diff;
  }

  if (bucketA === 2) {
    const diff = a.consumptionPercent - b.consumptionPercent;
    if (diff !== 0) return diff;
  }

  return a.categoryName.localeCompare(b.categoryName, 'fr', { sensitivity: 'base' });
}

export function forecastProgressMetaClass(
  percent: number,
  remainingCents: number,
  tone: BudgetTone,
): string {
  if (isForecastBeyond(percent, remainingCents)) {
    return tone === 'expense' ? 'font-semibold text-error' : 'font-semibold text-success-strong';
  }
  return 'text-fg-muted';
}

export function forecastProgressRemainingLabel(remainingCents: number, tone: BudgetTone): string {
  if (remainingCents >= 0) return `Reste ${formatCents(remainingCents)}`;
  if (tone === 'expense') return `Dépassement ${formatCents(Math.abs(remainingCents))}`;
  return `+${formatCents(Math.abs(remainingCents))}`;
}

/** Badge du % : teintes alignées sur la jauge ; dépassement saturé. */
export function forecastProgressPercentBadgeClass(
  percent: number,
  remainingCents: number,
  tone: BudgetTone,
): string {
  if (isForecastBeyond(percent, remainingCents)) {
    return tone === 'expense' ? 'bg-error text-white' : 'bg-success text-white';
  }
  if (percent <= 0) return 'bg-subtle text-fg-muted';
  if (percent < 25) return 'bg-error/15 text-error';
  if (percent < 50) return 'bg-warning-strong/20 text-warning-strong';
  if (percent < 75) return 'bg-warning/20 text-warning-strong';
  return 'bg-success/15 text-success-strong';
}

export function forecastProgressPercentBadgeLabel(percent: number, remainingCents: number): string {
  if (remainingCents < 0 && percent > 100) return `+${percent - 100} %`;
  if (remainingCents < 0 && percent <= 100) return `${percent} %`;
  return `${percent} %`;
}
