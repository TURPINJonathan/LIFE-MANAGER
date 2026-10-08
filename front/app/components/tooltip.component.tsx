import { type CSSProperties, type ReactNode, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@utils';

type TooltipSide = 'top' | 'bottom';

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  side?: TooltipSide;
  className?: string;
  /** Classes du panneau (remplace le gabarit centré par défaut). */
  tipClassName?: string;
};

const OFFSET = 8;
const VIEWPORT_MARGIN = 8;

function placeTooltip(trigger: HTMLElement, tip: HTMLElement | null, preferred: TooltipSide): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  const tipWidth = tip?.offsetWidth ?? 0;
  const tipHeight = tip?.offsetHeight ?? 0;
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  let side = preferred;

  if (tipHeight > 0) {
    const needed = tipHeight + OFFSET + VIEWPORT_MARGIN;
    if (side === 'top' && needed > spaceAbove && spaceBelow > spaceAbove) {
      side = 'bottom';
    } else if (side === 'bottom' && needed > spaceBelow && spaceAbove > spaceBelow) {
      side = 'top';
    }
  }

  let left = rect.left + rect.width / 2;
  if (tipWidth > 0) {
    const half = tipWidth / 2;
    left = Math.min(Math.max(left, VIEWPORT_MARGIN + half), window.innerWidth - VIEWPORT_MARGIN - half);
  }

  if (side === 'bottom') {
    return { top: rect.bottom + OFFSET, left, transform: 'translateX(-50%)' };
  }

  return { top: rect.top - OFFSET, left, transform: 'translate(-50%, -100%)' };
}

export function Tooltip({ content, children, side = 'top', className, tipClassName }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
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
      setStyle(placeTooltip(trigger, tipRef.current, side));
    }

    reposition();
    const frame = requestAnimationFrame(reposition);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, side, content]);

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
              ref={tipRef}
              id={tipId}
              role="tooltip"
              style={style ?? { visibility: 'hidden' }}
              className={cn(
                'pointer-events-none fixed z-[70] rounded-control bg-deep px-2.5 py-1.5 text-control font-medium text-white shadow-md animate-fade-in',
                tipClassName ?? 'max-w-xs text-center',
              )}
            >
              {content}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
