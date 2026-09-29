import { useEffect, useState } from 'react';

import { Icon } from '@components';
import { isTransparentColor } from '@constants';
import { apiFetch } from '@services';
import { useAuthStore } from '@store';
import { cn } from '@utils';

type MerchantVisualProps = {
  name: string;
  color: string;
  icon?: string | null;
  imageUrl?: string | null;
  /** Aperçu local (blob:) — prioritaire sur imageUrl. */
  localImageSrc?: string | null;
  className?: string;
  iconClassName?: string;
  /** Désactive le `title` natif (ex. quand un Tooltip enveloppe déjà). */
  showNativeTitle?: boolean;
};

/** Avatar enseigne (icône ou image auth). */
export function MerchantVisual({
  name,
  color,
  icon,
  imageUrl,
  localImageSrc,
  className,
  iconClassName = 'text-icon',
  showNativeTitle = true,
}: MerchantVisualProps) {
  const token = useAuthStore((state) => state.token);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const transparent = isTransparentColor(color);
  const displaySrc = localImageSrc || blobUrl;

  useEffect(() => {
    if (localImageSrc || !imageUrl || !token) {
      setBlobUrl(null);
      return;
    }
    let revoked: string | null = null;
    let cancelled = false;
    void (async () => {
      try {
        const response = await apiFetch(imageUrl, { method: 'GET' }, token);
        if (!response.ok) return;
        const blob = await response.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revoked = url;
        setBlobUrl(url);
      } catch {
        if (!cancelled) setBlobUrl(null);
      }
    })();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [imageUrl, localImageSrc, token]);

  return (
    <span
      className={cn(
        'flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-control',
        transparent ? 'text-fg-primary' : 'text-white',
        className,
      )}
      style={transparent ? undefined : { backgroundColor: color }}
      title={showNativeTitle ? name : undefined}
    >
      {displaySrc ? (
        <img
          src={displaySrc}
          alt=""
          className={cn('size-full', transparent ? 'object-contain p-0.5' : 'object-cover')}
        />
      ) : (
        <Icon name={icon || 'storefront'} className={iconClassName} />
      )}
    </span>
  );
}
