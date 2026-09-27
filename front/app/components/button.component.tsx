import type { ComponentPropsWithoutRef } from 'react';

import { Spinner } from '@components';
import { BUTTON_VARIANT, BUTTON_VARIANT_CLASSES, SPINNER_VARIANT } from '@constants';
import type { ButtonVariant } from '@app-types';
import { cn } from '@utils';

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  loading?: boolean;
  loadingLabel?: string;
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

export function Button({
  children,
  className,
  disabled,
  loading,
  loadingLabel,
  variant = BUTTON_VARIANT.primary,
  fullWidth = true,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled ?? loading}
      className={cn(BUTTON_VARIANT_CLASSES[variant], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading ? (
        <>
          <Spinner variant={SPINNER_VARIANT.inline} />
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
