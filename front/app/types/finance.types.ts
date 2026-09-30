export type CategoryKind = 'expense' | 'income' | 'both';

export type PaymentMethod = 'card' | 'check' | 'transfer' | 'direct_debit' | 'cash' | 'deposit';

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
  position: number;
  merchantIds: string[];
  favoriteMerchantId: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type Merchant = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  hasImage: boolean;
  imageUrl: string | null;
  position: number;
  categoryIds: string[];
  archivedAt: string | null;
  createdAt: string;
};

export type SubAccount = {
  id: string;
  accountId: string;
  name: string;
  icon: string;
  color: string;
  openingBalanceCents: number;
  balanceCents: number;
  provisionalBalanceCents: number;
  position: number;
  archivedAt: string | null;
  createdAt: string;
};

export type Account = {
  id: string;
  name: string;
  notes: string | null;
  position: number;
  archivedAt: string | null;
  createdAt: string;
  subAccounts: SubAccount[];
};

export type LedgerTransaction = {
  id: string;
  subAccountId: string;
  category: Pick<Category, 'id' | 'name' | 'icon' | 'color' | 'kind'>;
  merchant: Pick<Merchant, 'id' | 'name' | 'color' | 'icon' | 'hasImage' | 'imageUrl'> | null;
  operationDate: string;
  effectiveDate: string | null;
  paymentMethod: PaymentMethod;
  checkNumber: string | null;
  designation: string;
  amountCents: number;
  balanceAfterCents: number | null;
  hasAttachment: boolean;
  attachmentUrl: string | null;
  attachmentOriginalName: string | null;
  createdAt: string;
  updatedAt: string;
  /** Présent après create/update : une ligne budget a été ajoutée automatiquement. */
  forecastCategoryAdded?: boolean;
  forecastCategoryName?: string | null;
  forecastYearMonth?: string | null;
};

export type LedgerPayload = {
  subAccount: SubAccount;
  openingBalanceCents: number;
  transactions: LedgerTransaction[];
  hasMore: boolean;
  nextOffset: number | null;
};

export type CategoryMonthTransactionsPayload = {
  categoryId: string;
  yearMonth: string;
  transactions: LedgerTransaction[];
};

export type ForecastLine = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  categoryKind: CategoryKind;
  plannedAmountCents: number;
  flow: 'credit' | 'debit' | null;
  scheduledDay: number | null;
  position: number;
};

export type MonthlyForecast = {
  id: string;
  subAccountId: string;
  yearMonth: string;
  lines: ForecastLine[];
  createdAt: string;
  updatedAt: string;
};

export type ForecastLineInput = {
  categoryId: string;
  plannedAmountCents: number;
  flow?: 'credit' | 'debit' | null;
  scheduledDay?: number | null;
};

export type ForecastStatsCategory = {
  lineId: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  categoryKind: CategoryKind;
  flow: 'credit' | 'debit' | null;
  scheduledDay: number | null;
  plannedAmountCents: number;
  plannedSignedCents: number;
  actualSignedCents: number;
  actualAmountCents: number;
  remainingCents: number;
  consumptionPercent: number;
  overBudget: boolean;
};

export type ForecastTimelinePoint = {
  day: number;
  date: string;
  budgetBalanceCents: number;
  realisticBalanceCents: number;
  actualBalanceCents: number | null;
  events: Array<{
    kind: 'planned' | 'actual';
    label: string;
    categoryName: string;
    categoryColor: string;
    amountCents: number;
  }>;
};

export type ForecastStatsPreviousCategory = {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  categoryKind: CategoryKind;
  flow: 'credit' | 'debit' | null;
  isExpense: boolean;
  previousActualSignedCents: number;
  previousActualAmountCents: number;
  previousPlannedAmountCents: number;
  previousPlannedSignedCents: number;
};

export type ForecastStats = {
  yearMonth: string;
  hasForecast: boolean;
  forecastId: string | null;
  balances: {
    openingCents: number;
    currentCents: number;
    endOfMonthActualCents: number;
    projectedBudgetCents: number;
    projectedRealisticCents: number;
    varianceBudgetVsActualNetCents: number;
  };
  totals: {
    plannedIncomeCents: number;
    plannedExpenseCents: number;
    plannedNetCents: number;
    actualIncomeCents: number;
    actualExpenseCents: number;
    actualNetCents: number;
  };
  categories: ForecastStatsCategory[];
  unbudgeted: {
    incomeCents: number;
    expenseCents: number;
    items: Array<{
      categoryId: string;
      categoryName: string | null;
      categoryIcon: string | null;
      categoryColor: string | null;
      actualSignedCents: number;
      actualAmountCents: number;
    }>;
  };
  previousMonth: {
    yearMonth: string;
    hasForecast: boolean;
    totals: {
      plannedIncomeCents: number;
      plannedExpenseCents: number;
      actualIncomeCents: number;
      actualExpenseCents: number;
    };
    categories: ForecastStatsPreviousCategory[];
    orphans: ForecastStatsPreviousCategory[];
  };
  timeline: ForecastTimelinePoint[];
  meta: {
    daysInMonth: number;
    daysElapsed: number;
    daysRemaining: number;
    isCurrentMonth: boolean;
    isPastMonth: boolean;
    isFutureMonth: boolean;
  };
};
