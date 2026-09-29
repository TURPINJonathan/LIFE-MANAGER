import type { ReactNode } from 'react';

import { FIELD_HINT_CLASSES, FIELD_LABEL_CLASSES } from '@constants';
import { cn } from '@utils';

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function FormField({ label, htmlFor, hint, action, children, className }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <div className="mb-1.5 flex items-end justify-between gap-2">
        <label htmlFor={htmlFor} className={cn(FIELD_LABEL_CLASSES, 'mb-0')}>
          {label}
        </label>
        {action}
      </div>
      {children}
      {hint && <p className={FIELD_HINT_CLASSES}>{hint}</p>}
    </div>
  );
}
