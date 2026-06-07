import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '@/api/client';
import { useAuthStore } from '@/store/auth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'SplitSOL',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#a855f7',
  });
}

/**
 * Requests permission and returns an Expo push token, or null on web/simulator/denied.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;

  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  try {
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return token.data;
  } catch (err) {
    console.warn('[push] Could not get Expo push token', err);
    return null;
  }
}

/** Registers device token with the API when permission is granted. */
export async function syncPushTokenWithBackend(): Promise<string | null> {
  const token = await registerForPushNotificationsAsync();
  if (!token) return null;
  const user = await api.updateMe({ push_token: token });
  const sessionToken = useAuthStore.getState().token;
  if (sessionToken) {
    useAuthStore.getState().setSession(sessionToken, user);
  }
  return token;
}
