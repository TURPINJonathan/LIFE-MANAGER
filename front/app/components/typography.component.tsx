import type { ComponentPropsWithoutRef, ElementType } from 'react';

import {
  TYPOGRAPHY_VARIANT,
  TYPOGRAPHY_VARIANT_CLASSES,
  TYPOGRAPHY_VARIANT_DEFAULT_WEIGHT,
  TYPOGRAPHY_VARIANT_ELEMENT,
  TYPOGRAPHY_WEIGHT,
} from '@constants';
import type { TypographyElement, TypographyVariant, TypographyWeight } from '@app-types';
import { cn } from '@utils';

type TypographyProps = ComponentPropsWithoutRef<'p'> & {
  variant?: TypographyVariant;
  weight?: TypographyWeight;
  as?: TypographyElement;
};

export function Typography({ variant = TYPOGRAPHY_VARIANT.body, weight, as, className, ...props }: TypographyProps) {
  const Tag: ElementType = as ?? TYPOGRAPHY_VARIANT_ELEMENT[variant];
  const weightClass = TYPOGRAPHY_WEIGHT[weight ?? TYPOGRAPHY_VARIANT_DEFAULT_WEIGHT[variant]];

  return <Tag className={cn(TYPOGRAPHY_VARIANT_CLASSES[variant], weightClass, className)} {...props} />;
}
