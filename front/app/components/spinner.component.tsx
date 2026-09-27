import { SPINNER_VARIANT, SPINNER_VARIANT_CLASSES } from '@constants';
import type { SpinnerVariant } from '@app-types';
import { cn } from '@utils';

export function Spinner({
  variant = SPINNER_VARIANT.page,
  className,
}: {
  variant?: SpinnerVariant;
  className?: string;
}) {
  return (
    <span
      className={cn('block animate-spin rounded-full', SPINNER_VARIANT_CLASSES[variant], className)}
      aria-hidden="true"
    />
  );
}
