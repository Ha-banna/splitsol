import bs58 from 'bs58';
import { Platform } from 'react-native';
import type { SolanaWalletProvider } from '@/types/solana-wallet';

type InjectedWallet = {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  publicKey?: { toBase58(): string; toString(): string };
  connect?(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toBase58(): string } }>;
  signMessage?(
    message: Uint8Array,
    display?: 'utf8' | 'hex',
  ): Promise<{ signature: Uint8Array }>;
};

function wrapInjectedWallet(raw: InjectedWallet, name: string): SolanaWalletProvider | null {
  if (typeof raw.connect !== 'function' || typeof raw.signMessage !== 'function') {
    return null;
  }

  return {
    name,
    async connect(options) {
      await raw.connect!(options);
    },
    getAddress() {
      if (!raw.publicKey) {
        throw new Error(`${name} is not connected`);
      }
      return raw.publicKey.toBase58?.() ?? raw.publicKey.toString();
    },
    async signMessage(message) {
      const messageBytes = new TextEncoder().encode(message);
      const { signature } = await raw.signMessage!(messageBytes, 'utf8');
      return bs58.encode(signature);
    },
  };
}

/** Detect Phantom, Solflare, Backpack, or any injected Solana wallet on web */
export function getBrowserSolanaWallet(): SolanaWalletProvider | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  const candidates: Array<[InjectedWallet | undefined, string]> = [
    [window.phantom?.solana, 'Phantom'],
    [window.solflare, 'Solflare'],
    [window.backpack, 'Backpack'],
    [window.solana, 'Solana'],
  ];

  for (const [raw, name] of candidates) {
    if (!raw) continue;
    const wallet = wrapInjectedWallet(raw, name);
    if (wallet) return wallet;
  }

  return null;
}

export function isBrowserWalletAvailable(): boolean {
  return getBrowserSolanaWallet() != null;
}
