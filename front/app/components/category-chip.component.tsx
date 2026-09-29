import { Icon } from './icon.component';
import { cn } from '@utils';

type CategoryChipProps = {
  name: string;
  color: string;
  icon: string;
  className?: string;
  /** Masque le libellé (icône seule) — rare ; par défaut chip complet. */
  iconOnly?: boolean;
};

/** Pastille catégorie (teinte dérivée de la couleur + icône + label). */
export function CategoryChip({ name, color, icon, className, iconOnly = false }: CategoryChipProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center justify-center gap-1.5 rounded-full border px-2 py-0.5 text-center text-control font-medium',
        className,
      )}
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 32%, transparent)`,
      }}
      title={iconOnly ? name : undefined}
    >
      <Icon name={icon} className="shrink-0 text-[14px]!" />
      {iconOnly ? null : <span className="min-w-0 truncate">{name}</span>}
    </span>
  );
}
