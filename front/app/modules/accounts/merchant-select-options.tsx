import { MerchantVisual } from '@merchants';
import type { Category, Merchant, SelectOption } from '@app-types';

function byNameFr(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
}

function merchantLeading(merchant: Merchant) {
  return (
    <MerchantVisual
      name={merchant.name}
      color={merchant.color}
      icon={merchant.icon}
      imageUrl={merchant.imageUrl}
      className="size-6"
      iconClassName="text-[13px]!"
      showNativeTitle={false}
    />
  );
}

/** Enseignes liées à la catégorie (A–Z) puis les autres (A–Z). */
export function buildMerchantSelectOptions(merchants: Merchant[], category: Category | undefined): SelectOption[] {
  const linkedIds = new Set(category?.merchantIds ?? []);
  const linked = merchants.filter((item) => linkedIds.has(item.id)).sort(byNameFr);
  const others = merchants.filter((item) => !linkedIds.has(item.id)).sort(byNameFr);

  const options: SelectOption[] = [{ value: '', label: 'Aucune' }];

  if (linked.length > 0) {
    options.push({
      value: '__heading_linked',
      label: 'Liées à la catégorie',
      heading: true,
    });
    for (const merchant of linked) {
      const favorite = category?.favoriteMerchantId === merchant.id;
      options.push({
        value: merchant.id,
        label: favorite ? `${merchant.name} ★` : merchant.name,
        leading: merchantLeading(merchant),
      });
    }
  }

  if (others.length > 0) {
    if (linked.length > 0) {
      options.push({
        value: '__heading_others',
        label: 'Autres enseignes',
        heading: true,
      });
    }
    for (const merchant of others) {
      options.push({
        value: merchant.id,
        label: merchant.name,
        leading: merchantLeading(merchant),
      });
    }
  }

  return options;
}

export function favoriteMerchantIdForCategory(category: Category | undefined): string {
  return category?.favoriteMerchantId ?? '';
}
