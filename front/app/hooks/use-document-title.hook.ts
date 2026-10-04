import { useEffect } from 'react';

/** Pose `document.title` côté client (titres dynamiques hors `meta()` de route). */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
