import { Link } from 'react-router';

import { Icon } from '@components';
import { accountLedgerPath } from '@constants';
import type { Account, SubAccount } from '@app-types';
import { cn, formatCents, signedAmountClass } from '@utils';

type SubAccountSwitcherProps = {
  accounts: Account[];
  activeId?: string;
  /** Vue courante à conserver en changeant de sous-compte. */
  view?: 'operations' | 'budget';
  /** Mois budget (`YYYY-MM`) — conservé si `view === 'budget'`. */
  yearMonth?: string;
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

export function SubAccountSwitcher({
  accounts,
  activeId,
  view = 'operations',
  yearMonth,
  className,
}: SubAccountSwitcherProps) {
  const items = flatten(accounts);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn('w-full', className)}>
      <ul className="m-0 flex w-full list-none gap-2 overflow-x-auto p-0 pb-1">
        {items.map((sub) => {
          const active = sub.id === activeId;
          const to = view === 'budget' ? accountLedgerPath(sub.id, 'budget', { yearMonth }) : accountLedgerPath(sub.id);
          return (
            <li key={sub.id} className="w-[9.5rem] shrink-0 sm:w-auto sm:min-w-0 sm:flex-1 sm:basis-0">
              <Link
                to={to}
                className={cn(
                  'relative flex h-full min-h-[4.75rem] w-full cursor-pointer flex-col overflow-hidden rounded-panel p-2.5 transition-[border-color,filter,background-color] duration-(--duration-fast) sm:min-h-[5.25rem] sm:p-3',
                  !active && 'hover:brightness-[0.98] dark:hover:brightness-110',
                )}
                style={{
                  backgroundColor: active
                    ? sub.color
                    : `color-mix(in srgb, ${sub.color} 14%, var(--color-elevated, #fff))`,
                  borderColor: active ? sub.color : `color-mix(in srgb, ${sub.color} 32%, transparent)`,
                }}
              >
                <Icon
                  name={sub.icon}
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none absolute top-1/2 -right-5 -translate-y-1/2 text-[4.5rem]! leading-none sm:-right-6 sm:text-[5.5rem]!',
                    active ? 'opacity-25' : 'opacity-[0.14]',
                  )}
                  style={{ color: active ? '#fff' : sub.color }}
                />

                <div className="relative z-10 min-w-0">
                  <p className={cn('truncate text-control font-semibold', active ? 'text-white' : 'text-fg-primary')}>
                    {sub.name}
                  </p>
                  <p className={cn('truncate text-[11px] leading-snug', active ? 'text-white/75' : 'text-fg-muted')}>
                    {sub.accountName}
                  </p>
                </div>

                <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-0.5 pt-1">
                  <p
                    className={cn(
                      'text-center text-[1.05rem] font-bold leading-none tracking-tight tabular-nums sm:text-[1.15rem]',
                      active ? 'text-white' : signedAmountClass(sub.provisionalBalanceCents),
                    )}
                  >
                    {formatCents(sub.provisionalBalanceCents)}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
