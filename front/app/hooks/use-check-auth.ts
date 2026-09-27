import { useEffect } from 'react';

import { useAuthStore } from '@store';

export function useCheckAuth(): void {
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);
}
