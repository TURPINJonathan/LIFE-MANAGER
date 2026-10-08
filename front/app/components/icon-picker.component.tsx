import { useMemo, useState } from 'react';

import { Button, Dialog, Icon } from '@components';
import { BUTTON_VARIANT, DEFAULT_ICON_NAME, DIALOG_SIZE, ICON_CATALOG_COUNT } from '@constants';
import { cn, filterIconCatalog } from '@utils';

type IconPickerProps = {
  value: string;
  onChange: (name: string) => void;
  label?: string;
};

export function IconPicker({ value, onChange, label = 'Icône' }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { icons, total, truncated } = useMemo(() => filterIconCatalog(query), [query]);
  const hasQuery = query.trim().length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-control font-medium text-fg-primary">{label}</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 cursor-pointer items-center gap-3 rounded-control border border-border bg-page px-3 text-left transition-colors hover:border-border-strong"
      >
        <span className="flex size-9 items-center justify-center rounded-control-sm bg-accent-tint text-accent">
          <Icon name={value || DEFAULT_ICON_NAME} className="text-icon" />
        </span>
        <span className="min-w-0 flex-1 truncate text-body text-fg-secondary">{value || DEFAULT_ICON_NAME}</span>
        <Icon name="search" className="text-icon-sm text-fg-muted" />
      </button>

      <Dialog isOpen={open} onClose={() => setOpen(false)} title="Choisir une icône" size={DIALOG_SIZE.large}>
        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher (ex. loyer, essence, cadeau, médecin…)"
            className="h-12 w-full rounded-control border border-border bg-page px-3 text-body outline-none focus:border-accent focus:shadow-[var(--focus-ring)]"
          />
          <p className="text-control text-fg-muted">
            {hasQuery
              ? truncated
                ? `${icons.length} sur ${total} résultat${total > 1 ? 's' : ''} — affinez la recherche`
                : `${total} résultat${total > 1 ? 's' : ''}`
              : `${icons.length} suggestions · ${ICON_CATALOG_COUNT} icônes au total — tapez un mot pour chercher`}
          </p>
          <div className="grid max-h-[50dvh] grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
            {icons.map((entry) => {
              const selected = entry.name === value;
              return (
                <button
                  key={entry.name}
                  type="button"
                  title={entry.labelsFr.join(', ')}
                  onClick={() => {
                    onChange(entry.name);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={cn(
                    'flex cursor-pointer flex-col items-center gap-1 rounded-control border px-2 py-3 text-control transition-colors',
                    selected
                      ? 'border-accent bg-accent-tint text-accent-press'
                      : 'border-border-subtle text-fg-secondary hover:border-border hover:bg-subtle',
                  )}
                >
                  <Icon name={entry.name} className="text-icon" />
                  <span className="line-clamp-2 w-full text-center text-[10px] leading-tight">{entry.labelsFr[0]}</span>
                </button>
              );
            })}
          </div>
          {icons.length === 0 && <p className="text-body text-fg-muted">Aucune icône ne correspond.</p>}
          <Button type="button" variant={BUTTON_VARIANT.ghost} onClick={() => setOpen(false)}>
            Fermer
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
