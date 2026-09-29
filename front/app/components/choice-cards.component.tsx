import { Icon } from '@components';
import { CHOICE_CARD_SHELL_CLASSES, CHOICE_CARD_STATE_CLASSES, CHOICE_CARDS_TRACK_CLASSES } from '@constants';
import { cn } from '@utils';

export type ChoiceCardOption<TValue extends string> = {
  value: TValue;
  label: string;
  icon?: string;
  disabled?: boolean;
};

type ChoiceCardsProps<TValue extends string> = {
  label: string;
  options: readonly ChoiceCardOption<TValue>[];
  value: TValue | null;
  onChange: (value: TValue) => void;
  className?: string;
};

export function ChoiceCards<TValue extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: ChoiceCardsProps<TValue>) {
  return (
    <div role="radiogroup" aria-label={label} className={className ?? CHOICE_CARDS_TRACK_CLASSES}>
      {options.map((option) => {
        const active = option.value === value;
        const disabled = option.disabled === true;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => {
              if (!disabled) onChange(option.value);
            }}
            className={cn(
              CHOICE_CARD_SHELL_CLASSES,
              disabled
                ? CHOICE_CARD_STATE_CLASSES.disabled
                : active
                  ? CHOICE_CARD_STATE_CLASSES.active
                  : CHOICE_CARD_STATE_CLASSES.inactive,
            )}
          >
            <Icon name={option.icon ?? 'circle'} className="text-[28px]! leading-none" />
            <span className="text-control font-medium leading-tight">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
