import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/lib/password';

describe('Password storage policy', () => {
  const schema = readFileSync(join(__dirname, '../supabase/schema.sql'), 'utf8');

  it('users table has no password_hash column', () => {
    expect(schema).not.toMatch(/password_hash/i);
    expect(schema).not.toMatch(/password\s+text/i);
    expect(schema).not.toMatch(/password\s+varchar/i);
  });

  it('authentication uses wallet_address and privy_id per PRD', () => {
    expect(schema).toContain('wallet_address');
    expect(schema).toContain('privy_id');
  });

  it('hashPassword uses unique salt per password (scrypt)', () => {
    const hash1 = hashPassword('same-password');
    const hash2 = hashPassword('same-password');
    expect(hash1).not.toBe(hash2);
    expect(hash1.startsWith('scrypt:')).toBe(true);
  });

  it('verifyPassword accepts correct password and rejects wrong', () => {
    const hash = hashPassword('my-secure-pass');
    expect(verifyPassword('my-secure-pass', hash)).toBe(true);
    expect(verifyPassword('wrong-pass', hash)).toBe(false);
  });
});
