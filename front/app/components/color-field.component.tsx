import { useEffect, useId, useRef, useState } from 'react';
import { HexColorInput, HexColorPicker } from 'react-colorful';

import { POPOVER_PLACEMENT, PRESET_COLORS, TRANSPARENT_COLOR, isTransparentColor } from '@constants';
import { cn } from '@utils';

import { Popover } from './popover.component';

type ColorFieldProps = {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  /** Remplace le dernier raccourci par « sans fond » (enseignes / logos). */
  allowTransparent?: boolean;
};

const CHECKERBOARD_STYLE = {
  backgroundColor: '#fff',
  backgroundImage:
    'linear-gradient(45deg, #d4d4d8 25%, transparent 25%), linear-gradient(-45deg, #d4d4d8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d8 75%), linear-gradient(-45deg, transparent 75%, #d4d4d8 75%)',
  backgroundSize: '8px 8px',
  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
} as const;

const FALLBACK_HEX = '#2563EB';

function toSolidHex(value: string): string {
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) return value.toUpperCase();
  return FALLBACK_HEX;
}

export function ColorField({ value, onChange, label = 'Couleur', allowTransparent = false }: ColorFieldProps) {
  const labelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(toSolidHex(value));
  const presets = allowTransparent ? ([...PRESET_COLORS.slice(0, -1), TRANSPARENT_COLOR] as const) : PRESET_COLORS;
  const transparent = isTransparentColor(value);
  const solidValue = toSolidHex(value);

  useEffect(() => {
    if (open) setDraft(toSolidHex(value));
  }, [open, value]);

  const applySolid = (hex: string) => {
    const next = toSolidHex(hex);
    setDraft(next);
    onChange(next);
  };

  const applyPreset = (color: string) => {
    if (isTransparentColor(color)) {
      onChange(color);
    } else {
      applySolid(color);
    }
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="text-control font-medium text-fg-primary">
        {label}
      </span>

      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex h-12 w-full cursor-pointer items-center gap-3 rounded-control border border-border bg-page px-3 text-left transition-colors hover:border-border-strong',
          open && 'border-accent shadow-[var(--focus-ring)]',
        )}
      >
        <span
          className="size-8 shrink-0 rounded-control-sm border border-border"
          style={transparent ? CHECKERBOARD_STYLE : { backgroundColor: solidValue }}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate font-mono text-body text-fg-secondary">
          {transparent ? 'Sans fond' : solidValue}
        </span>
        <span className="shrink-0 text-control text-fg-muted">Choisir</span>
      </button>

      <Popover
        isOpen={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        placement={POPOVER_PLACEMENT.bottomStart}
        matchAnchorWidth={false}
        label="Choisir une couleur"
      >
        <div className="flex w-56 flex-col gap-3 p-1.5">
          <div className="flex flex-col gap-1.5">
            <span className="text-control font-medium text-fg-primary">Prédéfinies</span>
            <div className="grid grid-cols-5 gap-1.5">
              {presets.map((color) => {
                const isTransparentPreset = isTransparentColor(color);
                const selected = value.trim().toLowerCase() === color.trim().toLowerCase();
                return (
                  <button
                    key={color}
                    type="button"
                    aria-label={isTransparentPreset ? 'Sans fond' : color}
                    title={isTransparentPreset ? 'Sans fond' : color}
                    aria-pressed={selected}
                    onClick={() => applyPreset(color)}
                    className={cn(
                      'aspect-square w-full cursor-pointer rounded-control border-2 transition-transform active:scale-95',
                      selected ? 'scale-[1.04] border-fg-primary' : 'border-border',
                    )}
                    style={isTransparentPreset ? CHECKERBOARD_STYLE : { backgroundColor: color }}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-control font-medium text-fg-primary">Personnalisée</span>
            <HexColorPicker color={draft} onChange={applySolid} className="!h-36 !w-full" />
            <div className="flex items-center gap-2">
              <span
                className="size-8 shrink-0 rounded-control-sm border border-border"
                style={{ backgroundColor: draft }}
                aria-hidden
              />
              <div className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-control text-fg-muted">
                  #
                </span>
                <HexColorInput
                  color={draft}
                  onChange={applySolid}
                  prefixed={false}
                  aria-label="Code hexadécimal"
                  className="h-9 w-full rounded-control border border-border bg-page pr-3 pl-7 font-mono text-body uppercase outline-none focus:border-accent focus:shadow-[var(--focus-ring)]"
                />
              </div>
            </div>
          </div>
        </div>
      </Popover>
    </div>
  );
}
