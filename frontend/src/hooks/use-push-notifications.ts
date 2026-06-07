import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { setAuthToken } from '@/lib/api';
import { syncPushTokenWithBackend } from '@/lib/push-notifications';
import { useAuthStore } from '@/store/auth';

async function trySyncPush(): Promise<boolean> {
  try {
    await syncPushTokenWithBackend();
    return true;
  } catch (err) {
    console.warn('[push] sync failed', err);
    return false;
  }
}

/** Registers for push notifications after login and syncs token to the backend. */
export function usePushNotifications(): void {
  const token = useAuthStore((s) => s.token);
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      syncedRef.current = false;
      return;
    }

    setAuthToken(token);

    let cancelled = false;
    const run = async () => {
      // Brief delay so auth header is ready after hydration / navigation.
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (cancelled || syncedRef.current) return;
      const ok = await trySyncPush();
      if (!cancelled && ok) syncedRef.current = true;
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const onAppState = (state: AppStateStatus) => {
      if (state !== 'active') return;
      setAuthToken(token);
      void trySyncPush();
    };

    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [token]);
}
