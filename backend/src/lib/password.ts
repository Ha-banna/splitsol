/**
 * SplitSOL does not store user passwords (wallet + Privy auth only).
 * This module exists so any future password-based admin/feature uses salted hashes.
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;
const KEY_LEN = 64;
const SALT_LEN = 16;

export function hashPassword(plainPassword: string): string {
  const salt = randomBytes(SALT_LEN);
  const hash = scryptSync(plainPassword, salt, KEY_LEN, SCRYPT_PARAMS);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(plainPassword: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  const actual = scryptSync(plainPassword, salt, KEY_LEN, SCRYPT_PARAMS);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
