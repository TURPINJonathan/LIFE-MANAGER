import type { ForecastStats, ForecastTimelinePoint, SubAccount } from '@app-types';

export type FlatSubAccount = SubAccount & { accountName: string };

export type SubForecastSummary = {
  hasForecast: boolean;
  overBudget: boolean;
  projectedRealisticCents: number;
  projectedBudgetCents: number;
  currentCents: number;
};

export type DashboardForecastAggregate = {
  yearMonth: string;
  balances: {
    projectedRealisticCents: number;
    projectedBudgetCents: number;
  };
  totals: {
    plannedIncomeCents: number;
    plannedExpenseCents: number;
    actualIncomeCents: number;
    actualExpenseCents: number;
  };
  unbudgetedExpenseCents: number;
  unbudgetedIncomeCents: number;
  withBudgetCount: number;
  totalSubsCount: number;
  missingBudget: FlatSubAccount[];
  overBudgetSubs: FlatSubAccount[];
  bySubId: Record<string, SubForecastSummary>;
  meta: ForecastStats['meta'] | null;
};

export type DashboardTimelineAggregate = {
  points: ForecastTimelinePoint[];
  daysElapsed: number;
  previousActualPoints: Array<{ day: number; balanceCents: number }>;
};

export function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function budgetStatusLabel(summary: SubForecastSummary | undefined): 'ok' | 'over' | 'missing' {
  if (!summary || !summary.hasForecast) {
    return 'missing';
  }
  return summary.overBudget ? 'over' : 'ok';
}

function pickTimelinePoint(
  timeline: ForecastTimelinePoint[],
  day: number,
  index: number,
): ForecastTimelinePoint | null {
  return timeline.find((point) => point.day === day) ?? timeline[index] ?? null;
}

/** Agrège les timelines des sous-comptes (soldes additionnés jour par jour). */
export function aggregateDashboardTimeline(
  subs: FlatSubAccount[],
  statsBySubId: Record<string, ForecastStats | null>,
  previousStatsBySubId: Record<string, ForecastStats | null> = {},
): DashboardTimelineAggregate {
  const withTimeline = subs
    .map((sub) => ({ sub, stats: statsBySubId[sub.id] ?? null }))
    .filter((row): row is { sub: FlatSubAccount; stats: ForecastStats } =>
      Boolean(row.stats?.timeline && row.stats.timeline.length > 0),
    );

  if (withTimeline.length === 0) {
    return { points: [], daysElapsed: 0, previousActualPoints: [] };
  }

  const daysElapsed = Math.max(...withTimeline.map((row) => row.stats.meta.daysElapsed), 0);
  const template = withTimeline.reduce((best, row) =>
    row.stats.timeline.length > best.stats.timeline.length ? row : best,
  ).stats.timeline;

  const staticBalanceCents = subs
    .filter((sub) => !(statsBySubId[sub.id]?.timeline && statsBySubId[sub.id]!.timeline.length > 0))
    .reduce((sum, sub) => sum + sub.balanceCents, 0);

  const points: ForecastTimelinePoint[] = template.map((templatePoint, index) => {
    let budgetBalanceCents = staticBalanceCents;
    let realisticBalanceCents = staticBalanceCents;
    let actualBalanceCents: number | null = templatePoint.day <= daysElapsed ? staticBalanceCents : null;
    const events: ForecastTimelinePoint['events'] = [];

    for (const { stats } of withTimeline) {
      const point = pickTimelinePoint(stats.timeline, templatePoint.day, index);
      if (!point) continue;
      budgetBalanceCents += point.budgetBalanceCents;
      realisticBalanceCents += point.realisticBalanceCents;
      if (actualBalanceCents !== null) {
        actualBalanceCents += point.actualBalanceCents ?? point.realisticBalanceCents;
      }
      for (const event of point.events) {
        events.push(event);
      }
    }

    return {
      day: templatePoint.day,
      date: templatePoint.date,
      budgetBalanceCents,
      realisticBalanceCents,
      actualBalanceCents,
      events: events.slice(0, 8),
    };
  });

  const previousWithTimeline = subs
    .map((sub) => previousStatsBySubId[sub.id] ?? null)
    .filter((stats): stats is ForecastStats => Boolean(stats?.timeline && stats.timeline.length > 0));

  const previousDaySet = new Set<number>();
  for (const stats of previousWithTimeline) {
    for (const point of stats.timeline) {
      previousDaySet.add(point.day);
    }
  }

  // Uniquement les sous-comptes qui ont une timeline M−1 (pas le solde actuel).
  const previousActualPoints = [...previousDaySet]
    .sort((a, b) => a - b)
    .map((day) => {
      let balanceCents = 0;
      for (const stats of previousWithTimeline) {
        const point = stats.timeline.find((row) => row.day === day);
        if (!point) continue;
        balanceCents += point.actualBalanceCents ?? point.realisticBalanceCents;
      }
      return { day, balanceCents };
    });

  return { points, daysElapsed, previousActualPoints };
}

export type UpcomingDeadline = {
  key: string;
  day: number;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  amountCents: number;
  isExpense: boolean;
  subAccountId: string;
  subAccountName: string;
  accountName: string;
};

/** Prochaines échéances budget (jour planifié ≥ aujourd’hui), triées. */
export function collectUpcomingDeadlines(
  subs: FlatSubAccount[],
  statsBySubId: Record<string, ForecastStats | null>,
  limit = 6,
): UpcomingDeadline[] {
  const items: UpcomingDeadline[] = [];
  const today = new Date().getDate();

  for (const sub of subs) {
    const stats = statsBySubId[sub.id];
    if (!stats?.hasForecast) continue;
    const daysInMonth = stats.meta.daysInMonth;
    for (const row of stats.categories) {
      const day = row.scheduledDay ?? daysInMonth;
      if (day < today) continue;
      const isExpense = row.categoryKind === 'expense' || (row.categoryKind === 'both' && row.flow === 'debit');
      items.push({
        key: `${sub.id}-${row.lineId}`,
        day,
        categoryName: row.categoryName,
        categoryColor: row.categoryColor,
        categoryIcon: row.categoryIcon,
        amountCents: row.plannedAmountCents,
        isExpense,
        subAccountId: sub.id,
        subAccountName: sub.name,
        accountName: sub.accountName,
      });
    }
  }

  return items.sort((a, b) => a.day - b.day || a.categoryName.localeCompare(b.categoryName, 'fr')).slice(0, limit);
}

export function aggregateDashboardForecast(
  yearMonth: string,
  subs: FlatSubAccount[],
  statsBySubId: Record<string, ForecastStats | null>,
): DashboardForecastAggregate {
  const bySubId: Record<string, SubForecastSummary> = {};
  const missingBudget: FlatSubAccount[] = [];
  const overBudgetSubs: FlatSubAccount[] = [];

  let projectedRealisticCents = 0;
  let projectedBudgetCents = 0;
  let plannedIncomeCents = 0;
  let plannedExpenseCents = 0;
  let actualIncomeCents = 0;
  let actualExpenseCents = 0;
  let unbudgetedExpenseCents = 0;
  let unbudgetedIncomeCents = 0;
  let withBudgetCount = 0;
  let meta: ForecastStats['meta'] | null = null;

  for (const sub of subs) {
    const stats = statsBySubId[sub.id] ?? null;
    const hasForecast = Boolean(stats?.hasForecast);
    const overBudget = Boolean(stats?.categories.some((row) => row.overBudget));

    const summary: SubForecastSummary = {
      hasForecast,
      overBudget,
      projectedRealisticCents: hasForecast && stats ? stats.balances.projectedRealisticCents : sub.balanceCents,
      projectedBudgetCents: hasForecast && stats ? stats.balances.projectedBudgetCents : sub.balanceCents,
      currentCents: hasForecast && stats ? stats.balances.currentCents : sub.balanceCents,
    };

    bySubId[sub.id] = summary;
    projectedRealisticCents += summary.projectedRealisticCents;
    projectedBudgetCents += summary.projectedBudgetCents;

    if (hasForecast && stats) {
      withBudgetCount += 1;
      plannedIncomeCents += stats.totals.plannedIncomeCents;
      plannedExpenseCents += stats.totals.plannedExpenseCents;
      actualIncomeCents += stats.totals.actualIncomeCents;
      actualExpenseCents += stats.totals.actualExpenseCents;
      unbudgetedExpenseCents += stats.unbudgeted.expenseCents;
      unbudgetedIncomeCents += stats.unbudgeted.incomeCents;
      if (!meta) {
        meta = stats.meta;
      }
      if (overBudget) {
        overBudgetSubs.push(sub);
      }
    } else {
      missingBudget.push(sub);
    }
  }

  return {
    yearMonth,
    balances: { projectedRealisticCents, projectedBudgetCents },
    totals: {
      plannedIncomeCents,
      plannedExpenseCents,
      actualIncomeCents,
      actualExpenseCents,
    },
    unbudgetedExpenseCents,
    unbudgetedIncomeCents,
    withBudgetCount,
    totalSubsCount: subs.length,
    missingBudget,
    overBudgetSubs,
    bySubId,
    meta,
  };
}
