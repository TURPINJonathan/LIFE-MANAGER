import { Icon } from '@components';
import type { Category, SelectOption } from '@app-types';

function byNameFr(a: Category, b: Category): number {
  return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
}

function categoryLeading(category: Category) {
  return (
    <span
      className="flex size-6 shrink-0 items-center justify-center rounded-full text-white"
      style={{ backgroundColor: category.color }}
    >
      <Icon name={category.icon} className="text-[13px]!" />
    </span>
  );
}

function pushGroup(
  options: SelectOption[],
  key: string,
  label: string,
  icon: string,
  iconClassName: string,
  items: Category[],
): void {
  if (items.length === 0) return;
  options.push({
    value: `__heading_${key}`,
    label,
    heading: true,
    leading: <Icon name={icon} className={iconClassName} />,
  });
  for (const category of items) {
    options.push({
      value: category.id,
      label: category.name,
      leading: categoryLeading(category),
    });
  }
}

/** Sorties (A–Z) → mixtes (A–Z) → entrées (A–Z), avec en-têtes icône. */
export function buildCategorySelectOptions(categories: Category[]): SelectOption[] {
  const expenses = categories.filter((item) => item.kind === 'expense').sort(byNameFr);
  const both = categories.filter((item) => item.kind === 'both').sort(byNameFr);
  const incomes = categories.filter((item) => item.kind === 'income').sort(byNameFr);

  const options: SelectOption[] = [];
  pushGroup(options, 'out', 'Sorties', 'arrow_downward', 'text-[1rem]! text-error', expenses);
  pushGroup(options, 'both', 'Mixtes', 'sync_alt', 'text-[1rem]! text-fg-muted', both);
  pushGroup(options, 'in', 'Entrées', 'arrow_upward', 'text-[1rem]! text-success-strong', incomes);
  return options;
}

/** Première catégorie utile pour préremplir une ligne (sortie → mixte → entrée). */
export function defaultCategoryId(categories: Category[]): string {
  const sorted = [
    ...categories.filter((item) => item.kind === 'expense').sort(byNameFr),
    ...categories.filter((item) => item.kind === 'both').sort(byNameFr),
    ...categories.filter((item) => item.kind === 'income').sort(byNameFr),
  ];
  return sorted[0]?.id ?? '';
}
