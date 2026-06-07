import { randomBytes } from 'crypto';
import { getSupabase } from '../lib/supabase';
import { signToken } from '../lib/jwt';
import { buildAuthMessage, parseWalletAddress, verifyWalletSignature } from '../lib/solana-auth';
import { verifyPrivyToken } from '../lib/privy';
import { isSupabaseConfigured } from '../config/env';
import { User } from '../types';
import { badRequest } from '../utils/errors';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/** Fallback when Supabase is not configured (local dev / unit tests). */
const memoryChallenges = new Map<
  string,
  { wallet: string; message: string; expiresAt: number }
>();

function rowToUser(row: Record<string, unknown>): User {
  return row as unknown as User;
}

async function purgeExpiredChallenges(): Promise<void> {
  if (!isSupabaseConfigured()) {
    const now = Date.now();
    for (const [nonce, c] of memoryChallenges) {
      if (c.expiresAt <= now) memoryChallenges.delete(nonce);
    }
    return;
  }

  await getSupabase()
    .from('auth_challenges')
    .delete()
    .lt('expires_at', new Date().toISOString());
}

export async function createWalletChallenge(walletAddress: string) {
  const wallet = parseWalletAddress(walletAddress);
  const nonce = randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const message = buildAuthMessage(nonce, timestamp);
  const expiresAt = timestamp + CHALLENGE_TTL_MS;

  await purgeExpiredChallenges();

  if (isSupabaseConfigured()) {
    const { error } = await getSupabase().from('auth_challenges').insert({
      nonce,
      wallet_address: wallet,
      message,
      expires_at: new Date(expiresAt).toISOString(),
    });
    if (error) throw error;
  } else {
    memoryChallenges.set(nonce, { wallet, message, expiresAt });
  }

  return { message, nonce, timestamp };
}

async function consumeChallenge(
  wallet: string,
  signedMessage: string,
): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabase()
      .from('auth_challenges')
      .select('nonce')
      .eq('wallet_address', wallet)
      .eq('message', signedMessage)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) throw error;
    if (!data) return false;

    await getSupabase().from('auth_challenges').delete().eq('nonce', data.nonce);
    return true;
  }

  let matchedNonce: string | null = null;
  for (const [nonce, c] of memoryChallenges) {
    if (c.wallet === wallet && c.message === signedMessage && c.expiresAt > Date.now()) {
      matchedNonce = nonce;
      break;
    }
  }
  if (!matchedNonce) return false;
  memoryChallenges.delete(matchedNonce);
  return true;
}

export async function authenticateWallet(
  walletAddress: string,
  signedMessage: string,
  signature: string,
): Promise<{ token: string; user: User }> {
  const wallet = parseWalletAddress(walletAddress);
  verifyWalletSignature(wallet, signedMessage, signature);

  const validChallenge = await consumeChallenge(wallet, signedMessage);
  if (!validChallenge) {
    throw badRequest('Invalid or expired authentication challenge. Request a new challenge first.');
  }

  const user = await upsertUserByWallet(wallet);
  if (!user.wallet_address?.trim()) {
    throw badRequest('Account must be linked to a Solana wallet');
  }

  const token = signToken({ sub: user.id, wallet: user.wallet_address });

  return { token, user };
}

export async function authenticatePrivy(privyToken: string): Promise<{ token: string; user: User }> {
  const privyUser = await verifyPrivyToken(privyToken);
  const user = await upsertUserByPrivy(privyUser);
  const token = signToken({ sub: user.id, wallet: user.wallet_address });
  return { token, user };
}

async function upsertUserByWallet(walletAddress: string): Promise<User> {
  const db = getSupabase();

  const { data: existing } = await db
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .maybeSingle();

  if (existing) {
    return rowToUser(existing);
  }

  const shortAddr = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
  const { data, error } = await db
    .from('users')
    .insert({
      wallet_address: walletAddress,
      display_name: shortAddr,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '42501') {
      throw badRequest(
        'Database rejected new user (RLS). Set SUPABASE_SERVICE_ROLE_KEY to the service_role secret, not the anon key.',
      );
    }
    throw error;
  }
  return rowToUser(data);
}

async function upsertUserByPrivy(privyUser: {
  privyId: string;
  email?: string;
  walletAddress?: string;
}): Promise<User> {
  const db = getSupabase();
  const wallet = privyUser.walletAddress!;

  const { data: byPrivy } = await db
    .from('users')
    .select('*')
    .eq('privy_id', privyUser.privyId)
    .maybeSingle();

  if (byPrivy) {
    return rowToUser(byPrivy);
  }

  const { data: byWallet } = await db
    .from('users')
    .select('*')
    .eq('wallet_address', wallet)
    .maybeSingle();

  if (byWallet) {
    const { data: updated } = await db
      .from('users')
      .update({ privy_id: privyUser.privyId, email: privyUser.email ?? null })
      .eq('id', byWallet.id)
      .select('*')
      .single();
    return rowToUser(updated!);
  }

  const displayName = privyUser.email?.split('@')[0] ?? `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  const { data, error } = await db
    .from('users')
    .insert({
      wallet_address: wallet,
      display_name: displayName,
      email: privyUser.email ?? null,
      privy_id: privyUser.privyId,
    })
    .select('*')
    .single();

  if (error) throw error;
  return rowToUser(data);
}
