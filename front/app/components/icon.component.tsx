import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@utils';

type IconProps = Omit<ComponentPropsWithoutRef<'span'>, 'children'> & {
  name: string;
  filled?: boolean;
};

export function Icon({ name, filled, className, ...props }: IconProps) {
  return (
    <span
      className={cn('material-symbols-outlined', filled && 'icon-filled', className)}
      translate="no"
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
}
