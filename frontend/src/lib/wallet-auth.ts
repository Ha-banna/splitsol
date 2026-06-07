import AsyncStorage from '@react-native-async-storage/async-storage';
import bs58 from 'bs58';
import { Platform } from 'react-native';
import nacl from 'tweetnacl';
import { apiRequest } from './api';
import { DEV_WALLET_ENABLED } from './config';
import { getBrowserSolanaWallet } from './solana-wallet';
import type { AuthResponse } from '@/types/api';
import type { SolanaWalletProvider } from '@/types/solana-wallet';

const WALLET_KEY = 'splitsol-wallet-secret';

export type WalletLoginMode =
  | { type: 'mobile'; name: string }
  | { type: 'browser'; name: string }
  | { type: 'dev' }
  | { type: 'unavailable' };

async function loadOrCreateDevKeypair(): Promise<nacl.SignKeyPair> {
  const stored = await AsyncStorage.getItem(WALLET_KEY);
  if (stored) {
    const secret = Uint8Array.from(JSON.parse(stored) as number[]);
    return nacl.sign.keyPair.fromSecretKey(secret);
  }
  const keypair = nacl.sign.keyPair();
  await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(Array.from(keypair.secretKey)));
  return keypair;
}

function signWithKeypair(keypair: nacl.SignKeyPair, message: string): string {
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
  return bs58.encode(signature);
}

async function authenticateWallet(
  walletAddress: string,
  signMessage: (message: string) => Promise<string>,
): Promise<AuthResponse> {
  const challenge = await apiRequest<{ message: string; nonce: string; timestamp: number }>(
    '/auth/wallet/challenge',
    {
      method: 'POST',
      body: JSON.stringify({ wallet_address: walletAddress }),
    },
  );

  const signature = await signMessage(challenge.message);

  const result = await apiRequest<AuthResponse>('/auth/wallet', {
    method: 'POST',
    body: JSON.stringify({
      wallet_address: walletAddress,
      signed_message: challenge.message,
      signature,
    }),
  });

  if (!result.user?.wallet_address?.trim()) {
    throw new Error('Server did not return a wallet-linked account');
  }

  return result;
}

async function loginWithBrowserWallet(wallet: SolanaWalletProvider): Promise<AuthResponse> {
  try {
    await wallet.connect({ onlyIfTrusted: true });
  } catch {
    await wallet.connect();
  }

  const walletAddress = wallet.getAddress();
  return authenticateWallet(walletAddress, (message) => wallet.signMessage(message));
}

async function loginWithDevWallet(): Promise<AuthResponse> {
  const keypair = await loadOrCreateDevKeypair();
  const walletAddress = bs58.encode(keypair.publicKey);
  return authenticateWallet(walletAddress, async (message) => signWithKeypair(keypair, message));
}

/**
 * Wallet login priority:
 * 1. Android — Mobile Wallet Adapter (Seeker Seed Vault, Phantom/Solflare on Android)
 * 2. Web — browser extension wallets (user must approve connect + sign)
 * 3. Dev — local keypair only when EXPO_PUBLIC_ENABLE_DEV_WALLET=true
 */
export async function loginWithWallet(): Promise<AuthResponse> {
  if (Platform.OS === 'android') {
    const { loginWithMobileWallet } = await import('./mobile-wallet');
    return loginWithMobileWallet();
  }

  const browserWallet = getBrowserSolanaWallet();
  if (browserWallet) {
    return loginWithBrowserWallet(browserWallet);
  }

  if (DEV_WALLET_ENABLED) {
    return loginWithDevWallet();
  }

  throw new Error(
    Platform.OS === 'web'
      ? 'Install a Solana wallet extension (Phantom, Solflare, or Backpack), then reload and try again.'
      : 'Use an Android dev build on Seeker to connect Seed Vault, or enable EXPO_PUBLIC_ENABLE_DEV_WALLET for local testing.',
  );
}

export function isWalletLoginAvailable(): boolean {
  if (Platform.OS === 'android') return true;
  if (getBrowserSolanaWallet()) return true;
  return DEV_WALLET_ENABLED;
}

export function getWalletLoginMode(): WalletLoginMode {
  if (Platform.OS === 'android') {
    return { type: 'mobile', name: 'Seed Vault' };
  }
  const browserWallet = getBrowserSolanaWallet();
  if (browserWallet) {
    return { type: 'browser', name: browserWallet.name };
  }
  if (DEV_WALLET_ENABLED) {
    return { type: 'dev' };
  }
  return { type: 'unavailable' };
}

export function getWalletLoginHint(): string {
  const mode = getWalletLoginMode();
  if (mode.type === 'mobile') {
    return 'Opens Seed Vault on Seeker (or your Solana wallet) to sign in and approve USDC payments.';
  }
  if (mode.type === 'browser') {
    return `You will approve connect and sign-in in ${mode.name}`;
  }
  if (mode.type === 'dev') {
    return 'Dev test wallet (EXPO_PUBLIC_ENABLE_DEV_WALLET) — not a real on-chain wallet';
  }
  return Platform.OS === 'web'
    ? 'Install Phantom, Solflare, or Backpack, enable the extension, then reload this page.'
    : 'Connect a Solana wallet to create an account.';
}

export async function getStoredWalletAddress(): Promise<string | null> {
  const browserWallet = getBrowserSolanaWallet();
  if (browserWallet) {
    try {
      return browserWallet.getAddress();
    } catch {
      // not connected
    }
  }

  if (!DEV_WALLET_ENABLED) return null;

  const stored = await AsyncStorage.getItem(WALLET_KEY);
  if (!stored) return null;
  const secret = Uint8Array.from(JSON.parse(stored) as number[]);
  const keypair = nacl.sign.keyPair.fromSecretKey(secret);
  return bs58.encode(keypair.publicKey);
}
