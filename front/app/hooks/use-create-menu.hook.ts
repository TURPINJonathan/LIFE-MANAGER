import { useEffect } from 'react';

import { NAV_ITEM_VARIANT, TABLET_MEDIA_QUERY } from '@constants';
import type { NavItemVariant } from '@app-types';

import { useDismissiblePanel } from './use-dismissible-panel.hook';
import { useMediaQuery } from './use-media-query.hook';

export function useCreateMenu(variant: NavItemVariant) {
  const { isOpen, open, close, triggerRef } = useDismissiblePanel();
  const isTablet = useMediaQuery(TABLET_MEDIA_QUERY);
  const isVariantVisible = variant === NAV_ITEM_VARIANT.rail ? isTablet : !isTablet;

  useEffect(() => {
    if (isOpen && !isVariantVisible) close();
  }, [close, isOpen, isVariantVisible]);

  return { isOpen, open, close, triggerRef };
}
