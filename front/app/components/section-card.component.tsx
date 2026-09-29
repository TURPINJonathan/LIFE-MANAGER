import type { ReactNode } from 'react';

import { Icon, Typography } from '@components';
import { cn } from '@utils';

type SectionCardProps = {
  title: string;
  icon: string;
  iconTint?: string | null;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ title, icon, iconTint, headerAction, children, className }: SectionCardProps) {
  const hasTint = iconTint !== undefined && iconTint !== null && iconTint !== '';

  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-panel border border-border-subtle bg-elevated p-4 shadow-sm',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          name={icon}
          className={cn('text-icon-sm', !hasTint && 'text-fg-muted')}
          style={hasTint ? { color: iconTint } : undefined}
        />
        <Typography variant="title" className="min-w-0 flex-1">
          {title}
        </Typography>
        {headerAction}
      </div>
      {children}
    </section>
  );
}
