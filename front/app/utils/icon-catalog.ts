import { ICON_CATALOG, ICON_CATALOG_FEATURED, ICON_EXTRA_LABELS, type IconCatalogEntry } from '@constants';

/** Soft cap so a very broad query stays scrollable. */
export const ICON_CATALOG_RESULT_LIMIT = 360;

/** @deprecated Prefer featured list; kept for callers/tests. */
export const ICON_CATALOG_EMPTY_QUERY_LIMIT = ICON_CATALOG_FEATURED.length;

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export type FilterIconCatalogResult = {
  icons: IconCatalogEntry[];
  total: number;
  truncated: boolean;
};

const catalogByName = new Map(ICON_CATALOG.map((entry) => [entry.name, entry]));

function searchableText(entry: IconCatalogEntry): string {
  const extra = ICON_EXTRA_LABELS[entry.name] ?? [];
  return normalizeSearch([entry.name, ...entry.labelsFr, ...extra].join(' '));
}

function scoreEntry(entry: IconCatalogEntry, tokens: string[]): number {
  const name = normalizeSearch(entry.name);
  const labels = [...entry.labelsFr, ...(ICON_EXTRA_LABELS[entry.name] ?? [])].map(normalizeSearch);
  const haystack = searchableText(entry);
  let score = 0;

  for (const token of tokens) {
    if (!haystack.includes(token)) {
      return -1;
    }
    if (name === token) score += 120;
    else if (name.startsWith(token) || name.includes(`_${token}`) || name.endsWith(`_${token}`)) score += 70;
    else if (name.includes(token)) score += 35;

    for (const label of labels) {
      if (label === token) score += 100;
      else if (label.startsWith(token)) score += 55;
      else if (label.includes(token)) score += 20;
    }
  }

  return score;
}

function featuredIcons(): IconCatalogEntry[] {
  const seen = new Set<string>();
  const icons: IconCatalogEntry[] = [];
  for (const name of ICON_CATALOG_FEATURED) {
    const entry = catalogByName.get(name);
    if (!entry || seen.has(name)) continue;
    seen.add(name);
    icons.push(withDisplayLabels(entry));
  }
  return icons;
}

/** Prefers a short FR label (extra synonym or existing) for the picker grid. */
function withDisplayLabels(entry: IconCatalogEntry): IconCatalogEntry {
  const extra = ICON_EXTRA_LABELS[entry.name];
  if (!extra?.length) return entry;
  const preferred = extra[0];
  if (entry.labelsFr[0] === preferred) return entry;
  return {
    name: entry.name,
    labelsFr: [preferred, ...entry.labelsFr.filter((label) => label !== preferred)],
  };
}

export function filterIconCatalog(query: string): FilterIconCatalogResult {
  const needle = normalizeSearch(query);
  const tokens = needle.split(/[^a-z0-9]+/).filter((token) => token.length > 0);

  if (tokens.length === 0) {
    const icons = featuredIcons();
    return {
      icons,
      total: ICON_CATALOG.length,
      truncated: ICON_CATALOG.length > icons.length,
    };
  }

  const ranked: { entry: IconCatalogEntry; score: number }[] = [];
  for (const entry of ICON_CATALOG) {
    const score = scoreEntry(entry, tokens);
    if (score >= 0) {
      ranked.push({ entry: withDisplayLabels(entry), score });
    }
  }

  ranked.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));
  const icons = ranked.slice(0, ICON_CATALOG_RESULT_LIMIT).map((row) => row.entry);

  return {
    icons,
    total: ranked.length,
    truncated: ranked.length > icons.length,
  };
}
