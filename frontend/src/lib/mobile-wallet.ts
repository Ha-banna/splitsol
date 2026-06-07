import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import type {
  AuthorizeAPI,
  Base64EncodedAddress,
} from '@solana-mobile/mobile-wallet-adapter-protocol';
import {
  SolanaMobileWalletAdapterError,
  SolanaMobileWalletAdapterErrorCode,
} from '@solana-mobile/mobile-wallet-adapter-protocol';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import { toUint8Array } from 'js-base64';
import { apiRequest } from './api';
import { MWA_APP_IDENTITY, MWA_CHAIN } from './mwa-config';
import type { AuthResponse } from '@/types/api';

const SOLANA_RPC =
  process.env.EXPO_PUBLIC_HELIUS_RPC_URL ?? 'https://api.mainnet-beta.solana.com';

const MWA_AUTH_TOKEN_KEY = 'splitsol-mwa-auth-token';

async function loadMwaAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(MWA_AUTH_TOKEN_KEY);
}

async function saveMwaAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(MWA_AUTH_TOKEN_KEY, token);
}

export async function clearMwaAuthToken(): Promise<void> {
  await AsyncStorage.removeItem(MWA_AUTH_TOKEN_KEY);
}

type WalletSession = {
  publicKey: PublicKey;
  address: Base64EncodedAddress;
};

function sessionFromAuthResult(result: {
  accounts: { address: Base64EncodedAddress }[];
  auth_token: string;
}): WalletSession {
  const account = result.accounts[0];
  if (!account) {
    throw new Error('No wallet account returned');
  }

  return {
    address: account.address,
    publicKey: new PublicKey(toUint8Array(account.address)),
  };
}

function assertExpectedWallet(session: WalletSession, expectedWalletBase58?: string): void {
  if (!expectedWalletBase58?.trim()) return;
  if (session.publicKey.toBase58() !== expectedWalletBase58.trim()) {
    throw new Error(
      'Your wallet account does not match your SplitSOL login. Sign in with the same wallet you use to pay.',
    );
  }
}

async function authorizeForLogin(wallet: AuthorizeAPI): Promise<WalletSession> {
  const result = await wallet.authorize({
    identity: MWA_APP_IDENTITY,
    chain: MWA_CHAIN,
  });
  await saveMwaAuthToken(result.auth_token);
  return sessionFromAuthResult(result);
}

async function authorizeForPayment(
  wallet: AuthorizeAPI,
  expectedWalletBase58?: string,
): Promise<WalletSession> {
  const cached = await loadMwaAuthToken();
  const baseParams = {
    identity: MWA_APP_IDENTITY,
    chain: MWA_CHAIN,
  };

  if (cached) {
    try {
      const result = await wallet.authorize({
        ...baseParams,
        auth_token: cached,
      });
      await saveMwaAuthToken(result.auth_token);
      const session = sessionFromAuthResult(result);
      assertExpectedWallet(session, expectedWalletBase58);
      return session;
    } catch {
      await clearMwaAuthToken();
      throw new Error(
        'Wallet session expired. Log out, sign in again, then retry your payment.',
      );
    }
  }

  const result = await wallet.authorize(baseParams);
  await saveMwaAuthToken(result.auth_token);
  const session = sessionFromAuthResult(result);
  assertExpectedWallet(session, expectedWalletBase58);
  return session;
}

async function resolveMinContextSlot(preferred?: number): Promise<number> {
  if (preferred != null && preferred > 0) return preferred;
  const connection = new Connection(SOLANA_RPC, 'confirmed');
  return connection.getSlot('confirmed');
}

type Web3MobileWallet = AuthorizeAPI & {
  signAndSendTransactions(params: {
    transactions: Transaction[];
    skipPreflight?: boolean;
    minContextSlot?: number;
  }): Promise<string[]>;
  signTransactions(params: {
    transactions: Transaction[];
    minContextSlot?: number;
  }): Promise<Transaction[]>;
};

async function signAndSendTransactionViaMwa(
  wallet: Web3MobileWallet,
  tx: Transaction,
  minContextSlot: number,
): Promise<string> {
  try {
    const signatures = await wallet.signAndSendTransactions({
      transactions: [tx],
      skipPreflight: false,
      minContextSlot,
    });
    const signature = signatures[0];
    if (!signature) {
      throw new Error('Wallet did not return a transaction signature');
    }
    return signature;
  } catch (signAndSendErr) {
    // Phantom on Android requires minContextSlot for signAndSend; if it still fails, sign + broadcast.
    const signed = await wallet.signTransactions({
      transactions: [tx],
      minContextSlot,
    });
    const signedTx = signed[0];
    if (!signedTx) {
      throw signAndSendErr instanceof Error ? signAndSendErr : new Error(String(signAndSendErr));
    }
    const connection = new Connection(SOLANA_RPC, 'confirmed');
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
    });
    const latest = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature, ...latest }, 'confirmed');
    return signature;
  }
}

function normalizeMobileWalletError(err: unknown): Error {
  if (
    err instanceof SolanaMobileWalletAdapterError &&
    err.code === SolanaMobileWalletAdapterErrorCode.ERROR_ASSOCIATION_CANCELLED
  ) {
    return new Error(
      'Wallet connection was interrupted. Return to SplitSOL and try again.',
    );
  }

  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  if (
    lower.includes('cancellationexception') ||
    lower.includes('user rejected') ||
    lower.includes('user denied') ||
    lower.includes('declined') ||
    lower.includes('cancelled') ||
    lower.includes('canceled')
  ) {
    return new Error('Transaction cancelled in your wallet.');
  }
  if (/insufficient|0x1/i.test(message) && !/usdc/i.test(message)) {
    return new Error(
      'Not enough SOL for network fees, or USDC balance too low. Add SOL for fees and ensure you have enough USDC.',
    );
  }
  return err instanceof Error ? err : new Error(message);
}

/**
 * Sign and broadcast a base64 serialized transaction via Mobile Wallet Adapter
 * (Seed Vault on Seeker, Phantom MWA on Android).
 *
 * Must be called directly from a user tap — do not await network I/O before this.
 */
export async function signAndSendWithMobileWallet(
  serializedBase64: string,
  expectedWalletBase58?: string,
  minContextSlot?: number,
): Promise<string> {
  try {
    return await transact(async (wallet) => {
      await authorizeForPayment(wallet, expectedWalletBase58);

      const tx = Transaction.from(Buffer.from(serializedBase64, 'base64'));
      const slot = await resolveMinContextSlot(minContextSlot);
      return signAndSendTransactionViaMwa(wallet as Web3MobileWallet, tx, slot);
    });
  } catch (err) {
    throw normalizeMobileWalletError(err);
  }
}

/**
 * Sign in via Mobile Wallet Adapter (Seed Vault on Seeker, Phantom MWA on Android, etc.)
 * Requires a custom Expo dev/production build — does not work in Expo Go.
 */
export async function loginWithMobileWallet(): Promise<AuthResponse> {
  return transact(async (wallet) => {
    const { publicKey, address } = await authorizeForLogin(wallet);
    const walletAddress = publicKey.toBase58();

    const challenge = await apiRequest<{ message: string; nonce: string; timestamp: number }>(
      '/auth/wallet/challenge',
      {
        method: 'POST',
        body: JSON.stringify({ wallet_address: walletAddress }),
      },
    );

    const messageBytes = new TextEncoder().encode(challenge.message);

    const signedMessages = await wallet.signMessages({
      addresses: [address],
      payloads: [messageBytes],
    });

    const signature = bs58.encode(signedMessages[0]);

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
  });
}
