'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/lib/store/settings';

/**
 * Fetches server-configured providers on mount and merges into settings store.
 * Renders nothing — purely a side-effect component.
 */
export function ServerProvidersInit() {
  const fetchServerProviders = useSettingsStore((state) => state.fetchServerProviders);

  useEffect(() => {
    if (useSettingsStore.persist.hasHydrated()) {
      fetchServerProviders();
      return;
    }

    return useSettingsStore.persist.onFinishHydration(() => {
      fetchServerProviders();
    });
  }, [fetchServerProviders]);

  return null;
}
