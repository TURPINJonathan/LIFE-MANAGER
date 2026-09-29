import type { CategoryKind, PaymentMethod } from '@app-types';

export const CATEGORY_KIND_LABELS: Record<CategoryKind, string> = {
  expense: 'Dépense',
  income: 'Revenu',
  both: 'Les deux',
};

export const CATEGORY_KIND_ICONS: Record<CategoryKind, string> = {
  expense: 'arrow_downward',
  income: 'arrow_upward',
  both: 'swap_vert',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: 'Carte',
  check: 'Chèque',
  transfer: 'Virement',
  direct_debit: 'Prélèvement',
  cash: 'Espèces',
  deposit: 'Dépôt',
};

export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  card: 'credit_card',
  check: 'money',
  transfer: 'swap_horiz',
  direct_debit: 'event_repeat',
  cash: 'payments',
  deposit: 'savings',
};

export const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];
export const CATEGORY_KINDS = Object.keys(CATEGORY_KIND_LABELS) as CategoryKind[];
