import type { ReactNode } from 'react';

import { Icon, Typography } from '@components';
import { cn } from '@utils';

type SectionCardTone = 'default' | 'accent' | 'brand' | 'success';

type SectionCardProps = {
  title: string;
  icon: string;
  iconTint?: string | null;
  tone?: SectionCardTone;
  /** Bordure de la coque (défaut true). */
  bordered?: boolean;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
};

const SECTION_CARD_TONE_CLASSES: Record<SectionCardTone, { bordered: string; plain: string }> = {
  default: {
    bordered: 'border border-border-subtle bg-elevated',
    plain: 'bg-elevated',
  },
  accent: {
    bordered: 'border border-accent/25 bg-accent-tint/70',
    plain: 'bg-accent-tint/70',
  },
  brand: {
    bordered: 'border border-brand/25 bg-brand/8',
    plain: 'bg-brand/8',
  },
  success: {
    bordered: 'border border-success/25 bg-success/8',
    plain: 'bg-success/8',
  },
};

const SECTION_CARD_ICON_TONE: Record<SectionCardTone, string> = {
  default: 'text-fg-muted',
  accent: 'text-accent-press',
  brand: 'text-brand',
  success: 'text-success-strong',
};

export function SectionCard({
  title,
  icon,
  iconTint,
  tone = 'default',
  bordered = true,
  headerAction,
  children,
  className,
}: SectionCardProps) {
  const hasTint = iconTint !== undefined && iconTint !== null && iconTint !== '';
  const surface = SECTION_CARD_TONE_CLASSES[tone][bordered ? 'bordered' : 'plain'];

  return (
    <section className={cn('relative flex flex-col gap-3 overflow-hidden rounded-panel p-3', surface, className)}>
      <Icon
        name={icon}
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-1/2 -right-10 -translate-y-1/2 text-[10rem]! leading-none opacity-[0.1] sm:-right-12 sm:text-[12rem]!',
          !hasTint && SECTION_CARD_ICON_TONE[tone],
        )}
        style={hasTint ? { color: iconTint } : undefined}
      />
      <div className="relative z-10 flex items-center gap-2">
        <Icon
          name={icon}
          className={cn('text-icon-sm', !hasTint && SECTION_CARD_ICON_TONE[tone])}
          style={hasTint ? { color: iconTint } : undefined}
        />
        <Typography variant="title" className="min-w-0 flex-1">
          {title}
        </Typography>
        {headerAction}
      </div>
      <div className="relative z-10 min-w-0 flex-1">{children}</div>
    </section>
  );
}
