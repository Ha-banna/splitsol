import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Metro host from Expo (e.g. 192.168.1.20:8081) — same machine as the API in dev. */
function devMachineHostFromExpo(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;

  if (!hostUri || typeof hostUri !== 'string') return null;

  const withoutProtocol = hostUri.replace(/^https?:\/\//, '');
  const host = withoutProtocol.split(':')[0]?.trim();
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
}

function defaultApiUrl(): string {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/v1';
  }
  return 'http://localhost:3000/v1';
}

function resolveApiUrl(): string {
  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (fromExtra) return fromExtra;

  const fromEnv = process.env.EXPO_PUBLIC_API_URL;

  if (__DEV__ && Platform.OS !== 'web' && fromEnv) {
    const lanHost = devMachineHostFromExpo();
    if (lanHost && /localhost|127\.0\.0\.1/.test(fromEnv)) {
      return `http://${lanHost}:3000/v1`;
    }
  }

  if (fromEnv) return fromEnv;
  return defaultApiUrl();
}

export const API_URL = resolveApiUrl();

/** Local keypair login — off by default; set EXPO_PUBLIC_ENABLE_DEV_WALLET=true in .env */
export const DEV_WALLET_ENABLED =
  __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DEV_WALLET === 'true';
