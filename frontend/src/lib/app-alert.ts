import { Alert, Platform } from 'react-native';

/** Alert that works on web (RN Alert.alert is unreliable in browsers). */
export function showAppAlert(title: string, message: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
