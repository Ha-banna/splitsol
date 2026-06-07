import { Platform } from 'react-native';

/** True on Solana Seeker hardware (client hint only — not security-critical). */
export function isSeekerDevice(): boolean {
  if (Platform.OS !== 'android') return false;
  const model = (Platform.constants as { Model?: string } | undefined)?.Model;
  return model === 'Seeker';
}
