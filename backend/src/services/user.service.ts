import { getSupabase } from '../lib/supabase';
import { User } from '../types';
import { badRequest, notFound } from '../utils/errors';
import { normalizeUsername, validateUsername } from '../utils/username';

function rowToUser(row: Record<string, unknown>): User {
  return row as unknown as User;
}

export async function getUserById(id: string): Promise<User> {
  const { data, error } = await getSupabase().from('users').select('*').eq('id', id).single();
  if (error || !data) throw notFound('User not found');
  return rowToUser(data);
}

export async function getUserByUsername(username: string): Promise<User> {
  const normalized = normalizeUsername(username);
  const { data, error } = await getSupabase()
    .from('users')
    .select('*')
    .eq('username', normalized)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw notFound('User not found');
  return rowToUser(data);
}

export async function isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
  const normalized = validateUsername(username);
  let query = getSupabase().from('users').select('id').eq('username', normalized);
  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return !data;
}

export async function updateUser(
  id: string,
  updates: {
    display_name?: string;
    username?: string | null;
    avatar_url?: string | null;
    push_token?: string;
  },
): Promise<User> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.display_name !== undefined) {
    const name = updates.display_name.trim();
    if (!name) throw badRequest('display_name cannot be empty');
    payload.display_name = name;
  }

  if (updates.username !== undefined) {
    if (updates.username === null || updates.username === '') {
      throw badRequest('username is required and cannot be removed');
    }
    const username = validateUsername(updates.username);
    const available = await isUsernameAvailable(username, id);
    if (!available) {
      throw badRequest('username is already taken');
    }
    payload.username = username;
  }

  if (updates.avatar_url !== undefined) {
    payload.avatar_url = updates.avatar_url;
  }
  if (updates.push_token !== undefined) {
    payload.push_token = updates.push_token;
  }

  const { data, error } = await getSupabase()
    .from('users')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw badRequest('username is already taken');
    }
    throw error;
  }
  if (!data) throw notFound('User not found');
  return rowToUser(data);
}

export async function searchUsers(query: string, limit = 10): Promise<User[]> {
  const q = query.trim();
  if (!q) return [];

  const normalized = q.startsWith('@') ? normalizeUsername(q.slice(1)) : q;
  const pattern = `%${normalized}%`;

  const { data, error } = await getSupabase()
    .from('users')
    .select('*')
    .or(
      `username.ilike.${pattern},display_name.ilike.${pattern},wallet_address.ilike.${pattern},sol_domain.ilike.${pattern}`,
    )
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(rowToUser);
}

export async function getUserByWallet(walletAddress: string): Promise<User | null> {
  const { data } = await getSupabase()
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .maybeSingle();
  return data ? rowToUser(data) : null;
}

export type PublicUserProfile = Pick<
  User,
  'id' | 'username' | 'display_name' | 'avatar_url' | 'wallet_address'
>;

export function toPublicProfile(user: User): PublicUserProfile {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    wallet_address: user.wallet_address,
  };
}
