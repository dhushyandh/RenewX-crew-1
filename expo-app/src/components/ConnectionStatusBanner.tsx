import React, { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { api, onConnectionChange } from '@/services/api';
import OfflineScreen from '@/screens/OfflineScreen';

export default function ConnectionStatusBanner() {
  const [offline, setOffline] = useState(false);

  const checkHealth = useCallback(async () => {
    // If running in browser and navigator reports explicitly offline, set offline immediately
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.onLine) {
      setOffline(true);
      return false;
    }

    try {
      const result = await api.health();
      const isHealthy = result?.status === 'healthy';
      setOffline(!isHealthy);
      return isHealthy;
    } catch {
      setOffline(true);
      return false;
    }
  }, []);

  useEffect(() => {
    // Initial health check
    checkHealth();

    // Web offline/online event listeners
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleWebOffline = () => setOffline(true);
      const handleWebOnline = () => checkHealth();

      window.addEventListener('offline', handleWebOffline);
      window.addEventListener('online', handleWebOnline);

      // Periodic check every 12 seconds
      const interval = setInterval(checkHealth, 12000);

      return () => {
        window.removeEventListener('offline', handleWebOffline);
        window.removeEventListener('online', handleWebOnline);
        clearInterval(interval);
      };
    }

    // Mobile AppState listener
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkHealth();
      }
    });

    // Global API network state listener
    const unsubConnection = onConnectionChange((isOffline) => {
      setOffline(isOffline);
    });

    const interval = setInterval(checkHealth, 12000);
    return () => {
      sub.remove();
      unsubConnection();
      clearInterval(interval);
    };
  }, [checkHealth]);

  if (!offline) return null;

  return <OfflineScreen onRetrySuccess={() => setOffline(false)} />;
}

