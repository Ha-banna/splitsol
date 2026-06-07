import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { badRequest } from '../utils/errors';

export function buildAuthMessage(nonce: string, timestamp: number): string {
  return `SplitSOL Authentication\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}

/** Canonical base58 address or throws 400 */
export function parseWalletAddress(walletAddress: string): string {
  if (!walletAddress || typeof walletAddress !== 'string') {
    throw badRequest('wallet_address is required');
  }
  const trimmed = walletAddress.trim();
  try {
    return new PublicKey(trimmed).toBase58();
  } catch {
    throw badRequest('Invalid Solana wallet address');
  }
}

export function verifyWalletSignature(
  walletAddress: string,
  signedMessage: string,
  signature: string,
): void {
  const publicKey = new PublicKey(parseWalletAddress(walletAddress));

  let signatureBytes: Uint8Array;
  try {
    signatureBytes = bs58.decode(signature);
  } catch {
    throw badRequest('Invalid signature encoding');
  }

  const messageBytes = new TextEncoder().encode(signedMessage);
  const publicKeyBytes = publicKey.toBytes();

  const valid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  if (!valid) {
    throw badRequest('Signature verification failed');
  }
}
