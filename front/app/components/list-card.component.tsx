import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Icon } from '@components';
import { CARD_STRETCHED_LINK_CLASSES, LIST_CARD_IDENTITY_CLASSES, LIST_CARD_SURFACE_CLASSES } from '@constants';
import { cn } from '@utils';

type ListCardProps = {
  to: string;
  title: string;
  subtitle?: ReactNode;
  avatarIcon: string;
  tintColor?: string | null;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function ListCard({
  to,
  title,
  subtitle = null,
  avatarIcon,
  tintColor = null,
  meta,
  actions,
  className,
}: ListCardProps) {
  const hasTint = tintColor !== null && tintColor !== '';

  return (
    <div
      className={cn('relative isolate', LIST_CARD_SURFACE_CLASSES, className)}
      style={hasTint ? { borderLeftColor: tintColor } : undefined}
    >
      <div className={LIST_CARD_IDENTITY_CLASSES}>
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-control text-white',
            !hasTint && 'bg-accent',
          )}
          style={hasTint ? { backgroundColor: tintColor } : undefined}
        >
          <Icon name={avatarIcon} className="text-icon-sm" />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link to={to} className={cn(CARD_STRETCHED_LINK_CLASSES, 'min-w-0')}>
            <span className="block truncate text-body font-medium text-fg-primary">{title}</span>
          </Link>
          {subtitle !== null && subtitle !== undefined && subtitle !== false && subtitle !== '' && (
            <div className="min-w-0 text-control text-fg-muted">
              {typeof subtitle === 'string' ? <span className="block truncate">{subtitle}</span> : subtitle}
            </div>
          )}
        </div>

        {meta !== undefined && <div className="relative z-10 shrink-0 text-right">{meta}</div>}
      </div>

      {actions !== undefined && <div className="relative z-10 flex shrink-0 items-center gap-1 pr-2">{actions}</div>}
    </div>
  );
}
