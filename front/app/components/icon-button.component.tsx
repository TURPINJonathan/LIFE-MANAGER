import { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { Icon } from '@components';
import { ICON_BUTTON_VARIANT, ICON_BUTTON_VARIANT_CLASSES } from '@constants';
import type { IconButtonVariant } from '@app-types';
import { cn } from '@utils';

type IconButtonProps = ComponentPropsWithoutRef<'button'> & {
  icon: string;
  variant?: IconButtonVariant;
  filled?: boolean;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, className, type = 'button', variant = ICON_BUTTON_VARIANT.accent, filled = false, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex size-9 cursor-pointer items-center justify-center rounded-full',
        'transition-[background,border-color,color] duration-(--duration-fast)',
        'disabled:cursor-not-allowed',
        ICON_BUTTON_VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      <Icon name={icon} filled={filled} className="text-icon-sm" />
    </button>
  );
});
