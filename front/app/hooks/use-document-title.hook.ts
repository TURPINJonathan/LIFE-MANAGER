import { useEffect } from 'react';

/** Pose le titre d’onglet côté client (écrans dynamiques). */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
