import { ApiError } from './api';
import { signAndSendSerializedTransaction } from './solana-transaction';

export type PreparedPayment = {
  serialized_transaction?: string;
  min_context_slot?: number;
  dev_mode?: boolean;
  total_usdc?: number;
};

/**
 * Returns tx signature: real on-chain when serialized tx present, dev mock in __DEV__ otherwise.
 */
export async function resolvePaymentSignature(
  prepared: PreparedPayment,
  devPrefix: 'devmock' | 'devmock_send',
  walletAddress?: string,
): Promise<string> {
  const serialized = prepared.serialized_transaction?.trim();
  if (serialized) {
    return signAndSendSerializedTransaction(serialized, walletAddress, prepared.min_context_slot);
  }
  if (__DEV__ || prepared.dev_mode) {
    return `${devPrefix}_${Date.now()}`;
  }
  throw new Error(
    'USDC payments need Solana RPC configured on the server and a connected wallet.',
  );
}

export function formatPaymentError(err: unknown): string {
  if (err instanceof ApiError) return err.message;

  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Payment failed';

  const lower = raw.toLowerCase();
  if (lower.includes('insufficient usdc') || lower.includes('insufficient funds')) {
    return raw;
  }
  if (
    lower.includes('cancellationexception') ||
    lower.includes('user rejected') ||
    lower.includes('user denied') ||
    lower.includes('cancelled') ||
    lower.includes('canceled')
  ) {
    return 'Transaction cancelled in your wallet.';
  }
  if (lower.includes('not enough sol') || lower.includes('insufficient lamports')) {
    return 'Not enough SOL in your wallet to pay network fees. Add a small amount of SOL, then try again.';
  }
  if (lower.includes('simulation failed') || lower.includes('blockhash not found')) {
    return 'Transaction could not be sent. Check your USDC balance, SOL for fees, and try again.';
  }
  if (lower.includes('connect a solana wallet')) {
    return raw;
  }

  return raw || 'Payment failed';
}
