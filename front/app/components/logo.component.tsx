import { LOGO_VARIANT } from '@constants';
import type { LogoVariant } from '@app-types';
import { cn } from '@utils';

export function Logo({ variant = LOGO_VARIANT.wordmark, className }: { variant?: LogoVariant; className?: string }) {
  const mark = (
    <svg
      viewBox="0 0 56 56"
      className={cn(variant === LOGO_VARIANT.mark ? 'block' : 'h-8 w-8', className)}
      aria-hidden="true"
    >
      <rect width="56" height="56" rx="14" className="fill-brand dark:fill-accent" />
      <path d="M14 36c4-8 8-12 14-12s10 4 14 12" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx="28" cy="20" r="3.5" fill="white" />
    </svg>
  );

  if (variant === LOGO_VARIANT.mark) {
    return mark;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-semibold tracking-wide text-brand dark:text-accent',
        className,
      )}
    >
      <svg viewBox="0 0 56 56" className="h-8 w-8" aria-hidden="true">
        <rect width="56" height="56" rx="14" className="fill-brand dark:fill-accent" />
        <path d="M14 36c4-8 8-12 14-12s10 4 14 12" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <circle cx="28" cy="20" r="3.5" fill="white" />
      </svg>
      Life Manager
    </span>
  );
}
