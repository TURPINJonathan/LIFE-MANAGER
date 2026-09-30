import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';

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

type SelectionIntent = 'all' | 'end';

function centsFromValue(value: string): number {
  return parseEurosToCents(value) ?? 0;
}

function isFullySelected(node: HTMLInputElement): boolean {
  return node.selectionStart === 0 && node.selectionEnd === node.value.length;
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
  const selectionIntentRef = useRef<SelectionIntent | null>(null);

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

  // Après un re-render contrôlé, React peut annuler la sélection : on la rétablit.
  useLayoutEffect(() => {
    const node = inputRef.current;
    if (!node || document.activeElement !== node) {
      return;
    }
    const intent = selectionIntentRef.current;
    if (intent === null) {
      return;
    }
    selectionIntentRef.current = null;
    if (intent === 'all') {
      node.select();
      return;
    }
    const len = node.value.length;
    node.setSelectionRange(len, len);
  }, [display]);

  const commitCents = (nextCents: number) => {
    selectionIntentRef.current = 'end';
    onChange(centsToInput(nextCents));
  };

  const selectAll = () => {
    selectionIntentRef.current = 'all';
    inputRef.current?.select();
  };

  const onMouseUp = (event: MouseEvent<HTMLInputElement>) => {
    // Sans ça, le mouseup replace le caret au point cliqué et annule le select du focus.
    event.preventDefault();
    selectAll();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }

    const node = inputRef.current;
    const replace = Boolean(node && isFullySelected(node) && node.value.length > 0);

    if (event.key >= '0' && event.key <= '9') {
      event.preventDefault();
      commitCents(appendTpeDigit(replace ? 0 : cents, Number(event.key)));
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      commitCents(replace ? 0 : backspaceTpeCents(cents));
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
      const node = inputRef.current;
      const replace = Boolean(node && isFullySelected(node) && node.value.length > 0);
      commitCents(appendTpeDigit(replace ? 0 : cents, Number(data)));
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
      onFocus={selectAll}
      onClick={selectAll}
      onMouseUp={onMouseUp}
      onKeyDown={onKeyDown}
      onInput={onInput}
      onPaste={onPaste}
      onBlur={onBlur}
    />
  );
}
