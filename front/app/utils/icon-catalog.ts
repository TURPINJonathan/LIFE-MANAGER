import { ICON_CATALOG, type IconCatalogEntry } from '@constants';

/** Max icons shown with an empty search (full catalog is ~3k). */
export const ICON_CATALOG_EMPTY_QUERY_LIMIT = 96;

/** Soft cap so a very broad query stays scrollable. */
export const ICON_CATALOG_RESULT_LIMIT = 240;

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export type FilterIconCatalogResult = {
  icons: IconCatalogEntry[];
  total: number;
  truncated: boolean;
};

export function filterIconCatalog(query: string): FilterIconCatalogResult {
  const needle = normalizeSearch(query);

  if (!needle) {
    const icons = ICON_CATALOG.slice(0, ICON_CATALOG_EMPTY_QUERY_LIMIT);
    return {
      icons,
      total: ICON_CATALOG.length,
      truncated: ICON_CATALOG.length > icons.length,
    };
  }

  const matched = ICON_CATALOG.filter((entry) => {
    if (normalizeSearch(entry.name).includes(needle)) {
      return true;
    }
    return entry.labelsFr.some((label) => normalizeSearch(label).includes(needle));
  });

  const icons = matched.slice(0, ICON_CATALOG_RESULT_LIMIT);
  return {
    icons,
    total: matched.length,
    truncated: matched.length > icons.length,
  };
}
