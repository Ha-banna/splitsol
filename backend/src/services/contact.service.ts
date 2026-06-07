import { getSupabase } from '../lib/supabase';
import { User } from '../types';
import { badRequest, forbidden, notFound } from '../utils/errors';
import {
  notifyFriendRequestAccepted,
  notifyFriendRequestReceived,
} from './notification.service';
import { getUserById, getUserByUsername } from './user.service';

function rowToUser(row: Record<string, unknown>): User {
  return row as unknown as User;
}

export type ContactWithUser = {
  id: string;
  contact_user_id: string;
  created_at: string;
  user: User;
};

export type FriendRequestWithUser = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  user: User;
};

async function resolveTargetUser(input: {
  user_id?: string;
  username?: string;
}): Promise<User> {
  if (input.user_id) {
    return getUserById(input.user_id);
  }
  if (input.username) {
    return getUserByUsername(input.username);
  }
  throw badRequest('user_id or username is required');
}

async function hasContactRow(ownerId: string, contactUserId: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from('user_contacts')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('contact_user_id', contactUserId)
    .maybeSingle();
  return !!data;
}

export async function areFriends(userId: string, otherUserId: string): Promise<boolean> {
  if (userId === otherUserId) return false;
  const [a, b] = await Promise.all([
    hasContactRow(userId, otherUserId),
    hasContactRow(otherUserId, userId),
  ]);
  return a && b;
}

export async function assertAreFriends(userId: string, otherUserId: string): Promise<void> {
  if (!(await areFriends(userId, otherUserId))) {
    throw badRequest('You can only add friends to a group. Send a friend request first.');
  }
}

async function linkMutualContacts(userA: string, userB: string): Promise<void> {
  const db = getSupabase();
  const pairs = [
    { owner_id: userA, contact_user_id: userB },
    { owner_id: userB, contact_user_id: userA },
  ];

  for (const row of pairs) {
    const exists = await hasContactRow(row.owner_id, row.contact_user_id);
    if (!exists) {
      const { error } = await db.from('user_contacts').insert(row);
      if (error && error.code !== '23505') throw error;
    }
  }
}

function mapRequestRow(
  row: Record<string, unknown>,
  userField: 'from_user' | 'to_user',
): FriendRequestWithUser {
  const nested = row[userField] as Record<string, unknown> | Record<string, unknown>[] | undefined;
  const userRow = Array.isArray(nested) ? nested[0] : nested;
  return {
    id: row.id as string,
    from_user_id: row.from_user_id as string,
    to_user_id: row.to_user_id as string,
    status: row.status as FriendRequestWithUser['status'],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    user: rowToUser(userRow!),
  };
}

/** Mutual friends only (both users saved each other). */
export async function listContacts(ownerId: string): Promise<ContactWithUser[]> {
  const { data, error } = await getSupabase()
    .from('user_contacts')
    .select('id, contact_user_id, created_at, user:users!contact_user_id(*)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []).map((row) => {
    const r = row as {
      id: string;
      contact_user_id: string;
      created_at: string;
      user: Record<string, unknown> | Record<string, unknown>[];
    };
    const userRow = Array.isArray(r.user) ? r.user[0] : r.user;
    return {
      id: r.id,
      contact_user_id: r.contact_user_id,
      created_at: r.created_at,
      user: rowToUser(userRow),
    };
  });

  const mutual: ContactWithUser[] = [];
  for (const c of rows) {
    if (await hasContactRow(c.contact_user_id, ownerId)) {
      mutual.push(c);
    }
  }
  return mutual;
}

export async function listIncomingFriendRequests(userId: string): Promise<FriendRequestWithUser[]> {
  const { data, error } = await getSupabase()
    .from('friend_requests')
    .select('*, from_user:users!from_user_id(*)')
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapRequestRow(row as Record<string, unknown>, 'from_user'));
}

export async function listOutgoingFriendRequests(userId: string): Promise<FriendRequestWithUser[]> {
  const { data, error } = await getSupabase()
    .from('friend_requests')
    .select('*, to_user:users!to_user_id(*)')
    .eq('from_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapRequestRow(row as Record<string, unknown>, 'to_user'));
}

export async function sendFriendRequest(
  fromUserId: string,
  input: { user_id?: string; username?: string },
): Promise<FriendRequestWithUser | ContactWithUser> {
  const target = await resolveTargetUser(input);

  if (target.id === fromUserId) {
    throw badRequest('You cannot send a friend request to yourself');
  }

  if (await areFriends(fromUserId, target.id)) {
    throw badRequest('You are already friends');
  }

  const db = getSupabase();

  const { data: incoming } = await db
    .from('friend_requests')
    .select('id')
    .eq('from_user_id', target.id)
    .eq('to_user_id', fromUserId)
    .eq('status', 'pending')
    .maybeSingle();

  if (incoming) {
    return acceptFriendRequest(incoming.id as string, fromUserId);
  }

  const { data: existing } = await db
    .from('friend_requests')
    .select('id, status')
    .eq('from_user_id', fromUserId)
    .eq('to_user_id', target.id)
    .maybeSingle();

  if (existing?.status === 'pending') {
    throw badRequest('Friend request already sent');
  }

  if (existing?.status === 'declined') {
    const { data: updated, error } = await db
      .from('friend_requests')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('*, to_user:users!to_user_id(*)')
      .single();
    if (error) throw error;
    const resent = mapRequestRow(updated as Record<string, unknown>, 'to_user');
    notifyFriendRequestReceived(target.id, fromUserId, resent.id);
    return resent;
  }

  const { data, error } = await db
    .from('friend_requests')
    .insert({
      from_user_id: fromUserId,
      to_user_id: target.id,
      status: 'pending',
    })
    .select('*, to_user:users!to_user_id(*)')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw badRequest('Friend request already sent');
    }
    throw error;
  }

  const created = mapRequestRow(data as Record<string, unknown>, 'to_user');
  notifyFriendRequestReceived(target.id, fromUserId, created.id);
  return created;
}

export async function acceptFriendRequest(
  requestId: string,
  userId: string,
): Promise<ContactWithUser> {
  const db = getSupabase();
  const { data: request, error } = await db
    .from('friend_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (error || !request) throw notFound('Friend request not found');
  if (request.to_user_id !== userId) throw forbidden('Not your friend request to accept');
  if (request.status !== 'pending') {
    throw badRequest('This friend request is no longer pending');
  }

  await linkMutualContacts(request.from_user_id as string, request.to_user_id as string);

  await db
    .from('friend_requests')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', requestId);

  notifyFriendRequestAccepted(request.from_user_id as string, userId);

  const friend = await getUserById(request.from_user_id as string);
  const { data: contactRow } = await db
    .from('user_contacts')
    .select('id, contact_user_id, created_at')
    .eq('owner_id', userId)
    .eq('contact_user_id', friend.id)
    .single();

  return {
    id: contactRow!.id as string,
    contact_user_id: friend.id,
    created_at: contactRow!.created_at as string,
    user: friend,
  };
}

export async function declineFriendRequest(requestId: string, userId: string): Promise<void> {
  const db = getSupabase();
  const { data: request } = await db
    .from('friend_requests')
    .select('to_user_id, status')
    .eq('id', requestId)
    .maybeSingle();

  if (!request) throw notFound('Friend request not found');
  if (request.to_user_id !== userId) throw forbidden('Not your friend request to decline');
  if (request.status !== 'pending') {
    throw badRequest('This friend request is no longer pending');
  }

  const { error } = await db
    .from('friend_requests')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) throw error;
}

export async function cancelFriendRequest(requestId: string, userId: string): Promise<void> {
  const { error, count } = await getSupabase()
    .from('friend_requests')
    .delete({ count: 'exact' })
    .eq('id', requestId)
    .eq('from_user_id', userId)
    .eq('status', 'pending');

  if (error) throw error;
  if (!count) throw notFound('Friend request not found');
}

export async function removeContact(ownerId: string, contactUserId: string): Promise<void> {
  if (!(await areFriends(ownerId, contactUserId))) {
    throw notFound('Friend not found');
  }

  // Unfriend only removes the mutual contact link. Shared group memberships,
  // balances, and expense history are kept (Splitwise-style). Users cannot
  // add each other to new groups until they are friends again (addGroupMember).
  const db = getSupabase();
  const { error: e1 } = await db
    .from('user_contacts')
    .delete()
    .eq('owner_id', ownerId)
    .eq('contact_user_id', contactUserId);

  const { error: e2 } = await db
    .from('user_contacts')
    .delete()
    .eq('owner_id', contactUserId)
    .eq('contact_user_id', ownerId);

  if (e1) throw e1;
  if (e2) throw e2;
}
