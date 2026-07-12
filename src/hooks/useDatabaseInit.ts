/**
 * WorthBase (家底) - Database Initialization Hook
 * Ensures the database is initialized before any screen uses it.
 */

import { useEffect, useState } from 'react';
import { initDatabase } from '@/db/client';
import { useAccountStore } from '@/stores/account-store';
import { useAssetStore } from '@/stores/asset-store';
import { useSettingsStore } from '@/stores/settings-store';

type InitState = 'loading' | 'ready' | 'error';

/**
 * Hook to initialize the database and load all stores.
 * Call this once at the root layout level.
 */
export function useDatabaseInit(): { state: InitState; error: Error | null } {
  const [state, setState] = useState<InitState>('loading');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Initialize database
        await initDatabase();

        // Load all stores
        const accountStore = useAccountStore.getState();
        const assetStore = useAssetStore.getState();
        const settingsStore = useSettingsStore.getState();

        await Promise.all([
          accountStore.loadAccounts(),
          assetStore.loadAssets(),
          settingsStore.loadSettings(),
        ]);

        if (mounted) setState('ready');
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          setState('error');
        }
      }
    })();

    return () => { mounted = false; };
  }, []);

  return { state, error };
}
