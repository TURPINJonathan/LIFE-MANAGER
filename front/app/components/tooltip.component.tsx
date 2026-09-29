import { type CSSProperties, type ReactNode, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@utils';

type TooltipSide = 'top' | 'bottom';

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  side?: TooltipSide;
  className?: string;
};

const OFFSET = 8;

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setStyle(null);
      return;
    }

    function reposition(): void {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;

      if (side === 'bottom') {
        setStyle({
          top: rect.bottom + OFFSET,
          left: centerX,
          transform: 'translateX(-50%)',
        });
        return;
      }

      setStyle({
        top: rect.top - OFFSET,
        left: centerX,
        transform: 'translate(-50%, -100%)',
      });
    }

    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, side]);

  if (!content) {
    return <>{children}</>;
  }

  return (
    <span
      ref={triggerRef}
      className={cn('inline-flex max-w-full', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? tipId : undefined}
    >
      {children}
      {open && typeof document !== 'undefined'
        ? createPortal(
            <span
              id={tipId}
              role="tooltip"
              style={style ?? undefined}
              className="pointer-events-none fixed z-50 max-w-xs rounded-control bg-deep px-2.5 py-1.5 text-center text-control font-medium text-white shadow-md animate-fade-in"
            >
              {content}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
