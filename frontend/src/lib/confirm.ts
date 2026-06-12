import { Alert, Platform } from 'react-native';

/** Cross-platform confirm (Alert callbacks are unreliable on web). */
export function confirmAction(
  title: string,
  message: string,
  confirmLabel: string,
  destructive = false,
): Promise<boolean> {
  const canUseBrowserConfirm =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof window.confirm === 'function';

  if (canUseBrowserConfirm) {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

export function confirmDestructive(title: string, message: string): Promise<boolean> {
  return confirmAction(title, message, 'Delete', true);
}
