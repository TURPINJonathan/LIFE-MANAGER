import { Link } from 'react-router';

import { Icon } from '@components';
import { accountLedgerPath } from '@constants';
import type { Account, SubAccount } from '@app-types';
import { cn, formatCents, signedAmountClass } from '@utils';

type SubAccountSwitcherProps = {
  accounts: Account[];
  activeId?: string;
  className?: string;
};

type FlatSub = SubAccount & { accountName: string };

function flatten(accounts: Account[]): FlatSub[] {
  return accounts.flatMap((account) =>
    account.subAccounts.map((sub) => ({
      ...sub,
      accountName: account.name,
    })),
  );
}

export function SubAccountSwitcher({ accounts, activeId, className }: SubAccountSwitcherProps) {
  const items = flatten(accounts);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn('-mx-1 overflow-x-auto', className)}>
      <ul className="flex min-w-min gap-2 px-1 pb-1">
        {items.map((sub) => {
          const active = sub.id === activeId;
          return (
            <li key={sub.id} className="shrink-0">
              <Link
                to={accountLedgerPath(sub.id)}
                className={cn(
                  'flex min-w-[9.5rem] max-w-[12rem] cursor-pointer items-center gap-2.5 rounded-control border px-3 py-2.5 transition-colors',
                  active
                    ? 'border-accent bg-accent-tint text-accent-press'
                    : 'border-border-subtle bg-elevated text-fg-secondary hover:border-border hover:text-fg-primary',
                )}
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-control-sm text-white"
                  style={{ backgroundColor: sub.color }}
                >
                  <Icon name={sub.icon} className="text-icon-sm" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-control font-medium text-fg-primary">{sub.name}</span>
                  <span className="block truncate text-[11px] text-fg-muted">{sub.accountName}</span>
                  <span className={cn('mt-0.5 block text-control font-semibold', signedAmountClass(sub.balanceCents))}>
                    {formatCents(sub.balanceCents)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
