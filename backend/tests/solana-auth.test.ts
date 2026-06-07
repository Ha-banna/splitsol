import { describe, expect, it } from 'vitest';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { buildAuthMessage, parseWalletAddress, verifyWalletSignature } from '../src/lib/solana-auth';

describe('parseWalletAddress', () => {
  it('accepts a valid Solana address', () => {
    const keypair = nacl.sign.keyPair();
    const address = bs58.encode(keypair.publicKey);
    expect(parseWalletAddress(address)).toBe(address);
  });

  it('rejects empty and garbage input', () => {
    expect(() => parseWalletAddress('')).toThrow('wallet_address is required');
    expect(() => parseWalletAddress('not-a-wallet')).toThrow('Invalid Solana wallet address');
  });
});

describe('verifyWalletSignature', () => {
  it('verifies a detached signature for the auth message', () => {
    const keypair = nacl.sign.keyPair();
    const wallet = bs58.encode(keypair.publicKey);
    const message = buildAuthMessage('abc', Date.now());
    const signature = bs58.encode(
      nacl.sign.detached(new TextEncoder().encode(message), keypair.secretKey),
    );

    expect(() => verifyWalletSignature(wallet, message, signature)).not.toThrow();
  });

  it('rejects a signature from a different key', () => {
    const signer = nacl.sign.keyPair();
    const other = nacl.sign.keyPair();
    const wallet = bs58.encode(other.publicKey);
    const message = buildAuthMessage('xyz', Date.now());
    const signature = bs58.encode(
      nacl.sign.detached(new TextEncoder().encode(message), signer.secretKey),
    );

    expect(() => verifyWalletSignature(wallet, message, signature)).toThrow(
      'Signature verification failed',
    );
  });
});
