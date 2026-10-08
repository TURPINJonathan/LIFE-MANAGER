import { describe, expect, it } from 'vitest';

import { ICON_CATALOG_COUNT, ICON_CATALOG_FEATURED } from '../../../app/constants';
import { filterIconCatalog, normalizeSearch } from '../../../app/utils';

describe('filterIconCatalog', () => {
  it('montre des suggestions utiles sans recherche', () => {
    const result = filterIconCatalog('');
    expect(result.icons.length).toBeGreaterThan(40);
    expect(result.total).toBe(ICON_CATALOG_COUNT);
    expect(result.icons[0]?.name).toBe(ICON_CATALOG_FEATURED[0]);
    expect(result.icons.some((icon) => icon.name === 'abc')).toBe(false);
  });

  it('trouve des synonymes FR du quotidien', () => {
    const cases: Array<{ query: string; expected: string }> = [
      { query: 'loyer', expected: 'home' },
      { query: 'essence', expected: 'local_gas_station' },
      { query: 'cadeau', expected: 'featured_seasonal_and_gifts' },
      { query: 'salaire', expected: 'attach_money' },
      { query: 'médecin', expected: 'medical_services' },
      { query: 'impôt', expected: 'request_quote' },
      { query: 'abonnement', expected: 'subscriptions' },
      { query: 'internet', expected: 'wifi' },
      { query: 'chien', expected: 'pets' },
      { query: 'épargne', expected: 'savings' },
    ];

    for (const { query, expected } of cases) {
      const result = filterIconCatalog(query);
      expect(result.total).toBeGreaterThan(0);
      expect(result.icons.map((icon) => icon.name)).toContain(expected);
    }
  });

  it('ignore les accents', () => {
    expect(normalizeSearch('Épargne')).toBe('epargne');
    expect(filterIconCatalog('epargne').icons.some((icon) => icon.name === 'savings')).toBe(true);
  });
});
