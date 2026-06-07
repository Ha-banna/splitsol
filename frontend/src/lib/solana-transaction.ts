import { Connection, Transaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { Platform } from 'react-native';
import { getBrowserSolanaWallet } from './solana-wallet';

const DEFAULT_RPC =
  process.env.EXPO_PUBLIC_HELIUS_RPC_URL ?? 'https://api.mainnet-beta.solana.com';

type TxCapableWallet = {
  signAndSendTransaction?(transaction: Transaction): Promise<{ signature: string }>;
  signTransaction?(transaction: Transaction): Promise<Transaction>;
};

function getInjectedTxWallet(): TxCapableWallet | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const candidates = [window.phantom?.solana, window.solflare, window.backpack, window.solana];
  for (const w of candidates) {
    if (w && (w.signAndSendTransaction || w.signTransaction)) {
      return w as TxCapableWallet;
    }
  }
  return null;
}

/**
 * Deserialize, sign with the platform wallet, and broadcast.
 * Web: browser extension. Android (Seeker): Mobile Wallet Adapter / Seed Vault.
 */
export async function signAndSendSerializedTransaction(
  serializedBase64: string,
  expectedWalletAddress?: string,
  minContextSlot?: number,
): Promise<string> {
  if (Platform.OS === 'android') {
    const { signAndSendWithMobileWallet } = await import('./mobile-wallet');
    return signAndSendWithMobileWallet(serializedBase64, expectedWalletAddress, minContextSlot);
  }

  const raw = getInjectedTxWallet();
  if (!raw) {
    throw new Error(
      'Connect a Solana wallet (Phantom, Solflare, or Backpack) to send USDC on-chain.',
    );
  }

  const browserWallet = getBrowserSolanaWallet();
  if (browserWallet) {
    try {
      await browserWallet.connect({ onlyIfTrusted: true });
    } catch {
      await browserWallet.connect();
    }
  }

  const tx = Transaction.from(Buffer.from(serializedBase64, 'base64'));

  try {
    if (typeof raw.signAndSendTransaction === 'function') {
      const { signature } = await raw.signAndSendTransaction(tx);
      return signature;
    }

    if (typeof raw.signTransaction === 'function') {
      const signed = await raw.signTransaction(tx);
      const connection = new Connection(DEFAULT_RPC, 'confirmed');
      const sig = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
      });
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed');
      return sig;
    }

    throw new Error('Your wallet cannot sign transactions. Try Phantom or Solflare.');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/insufficient|0x1/i.test(message) && !/usdc/i.test(message)) {
      throw new Error(
        'Not enough SOL for network fees, or USDC balance too low. Add SOL for fees and ensure you have enough USDC.',
      );
    }
    throw err instanceof Error ? err : new Error(message);
  }
}
