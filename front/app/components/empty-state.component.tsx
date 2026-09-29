import type { ReactNode } from 'react';

import { Icon, Typography } from '@components';
import { cn } from '@utils';

type EmptyStateProps = {
  icon: string;
  title: string;
  message?: string;
  action?: ReactNode;
  /** Version carte (inspirée FYNX) : icône accent + texte centré, sans gros disque. */
  compact?: boolean;
  fullHeight?: boolean;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  message,
  action,
  compact = false,
  fullHeight = false,
  className,
}: EmptyStateProps) {
  if (compact) {
    return (
      <div
        className={cn(
          'flex min-h-28 w-full flex-1 items-center justify-center rounded-control px-3 py-5 text-center',
          fullHeight && 'min-h-full',
          className,
        )}
      >
        <div className="flex max-w-xs flex-col items-center gap-2">
          <span className="flex size-11 items-center justify-center rounded-full bg-accent-subtle text-accent">
            <Icon name={icon} className="text-icon" />
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="m-0 text-control font-medium text-fg-secondary">{title}</p>
            {message ? <p className="m-0 text-[12px] leading-snug text-fg-muted">{message}</p> : null}
          </div>
          {action}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-12 text-center',
        fullHeight && 'min-h-full',
        className,
      )}
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-subtle text-fg-muted">
        <Icon name={icon} className="text-icon" />
      </span>
      <div className="flex flex-col gap-1">
        <Typography variant="title" as="h2">
          {title}
        </Typography>
        {message && <p className="mx-auto max-w-md text-body text-fg-muted">{message}</p>}
      </div>
      {action}
    </div>
  );
}
