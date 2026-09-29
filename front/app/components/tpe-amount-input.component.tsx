import { useEffect, useRef, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';

import {
  appendTpeDigit,
  backspaceTpeCents,
  centsFromDigitString,
  centsToInput,
  formatTpeAmount,
  parseEurosToCents,
} from '@utils';

type TpeAmountInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  'aria-label'?: string;
};

function centsFromValue(value: string): number {
  return parseEurosToCents(value) ?? 0;
}

export function TpeAmountInput({
  id,
  value,
  onChange,
  onBlur,
  className,
  disabled,
  autoFocus,
  'aria-label': ariaLabel,
}: TpeAmountInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const cents = centsFromValue(value);
  const display = formatTpeAmount(cents);

  useEffect(() => {
    if (!autoFocus || disabled) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [autoFocus, disabled]);

  useEffect(() => {
    const node = inputRef.current;
    if (!node || document.activeElement !== node) {
      return;
    }
    const len = node.value.length;
    node.setSelectionRange(len, len);
  }, [display]);

  const commitCents = (nextCents: number) => {
    onChange(centsToInput(nextCents));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }

    if (event.key >= '0' && event.key <= '9') {
      event.preventDefault();
      commitCents(appendTpeDigit(cents, Number(event.key)));
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      commitCents(backspaceTpeCents(cents));
      return;
    }

    if (event.key === ',' || event.key === '.' || event.key === '-' || event.key === '+' || event.key === 'e') {
      event.preventDefault();
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }
    event.preventDefault();
    const text = event.clipboardData.getData('text');
    commitCents(centsFromDigitString(text));
  };

  const onInput = (event: FormEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }
    const data = (event.nativeEvent as InputEvent).data;
    if (data && /^\d$/.test(data)) {
      commitCents(appendTpeDigit(cents, Number(data)));
    }
  };

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      disabled={disabled}
      aria-label={ariaLabel}
      className={className}
      value={display}
      onChange={() => {
        /* Valeur pilotée par le clavier TPE (chiffres / retour arrière / collage). */
      }}
      onKeyDown={onKeyDown}
      onInput={onInput}
      onPaste={onPaste}
      onBlur={onBlur}
    />
  );
}
