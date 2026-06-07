import { env } from '../config/env';
import { getSupabase } from '../lib/supabase';
import { Group, GroupBalance, GroupMember, User } from '../types';
import { badRequest, forbidden, notFound } from '../utils/errors';
import { generateInviteCode } from '../utils/invite';
import {
  validateGroupDescription,
  validateGroupName,
} from '../utils/groupValidation';
import { assertAreFriends } from './contact.service';
import {
  notifyGroupJoined,
  notifyGroupMemberAdded,
} from './notification.service';
import { getUserById } from './user.service';

function rowToGroup(row: Record<string, unknown>): Group {
  return row as unknown as Group;
}

export async function assertGroupMember(groupId: string, userId: string): Promise<void> {
  const { data } = await getSupabase()
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) throw forbidden('You are not a member of this group');
}

export async function listGroupsForUser(userId: string) {
  const db = getSupabase();

  const { data: memberships, error } = await db
    .from('group_members')
    .select('group_id, groups(*)')
    .eq('user_id', userId);

  if (error) throw error;

  const groups = (memberships ?? [])
    .map((m) => {
      const row = m as { groups: Record<string, unknown> | Record<string, unknown>[] };
      const g = Array.isArray(row.groups) ? row.groups[0] : row.groups;
      return rowToGroup(g);
    })
    .filter((group) => !group.is_archived);

  const { data: balances } = await db.from('group_balances').select('*').eq('user_id', userId);

  return groups.map((group) => ({
    ...group,
    my_balance_usdc: Number(
      balances?.find((b) => b.group_id === group.id)?.net_balance_usdc ?? 0,
    ),
  }));
}

export async function createGroup(
  userId: string,
  input: { name: string; description?: string | null },
): Promise<Group> {
  const inviteCode = generateInviteCode();
  const name = validateGroupName(input.name);
  const description = validateGroupDescription(input.description);

  const { data: group, error } = await getSupabase()
    .from('groups')
    .insert({
      name,
      description,
      created_by: userId,
      invite_code: inviteCode,
    })
    .select('*')
    .single();

  if (error) throw error;

  await getSupabase().from('group_members').insert({
    group_id: group.id,
    user_id: userId,
    role: 'admin',
  });

  return rowToGroup(group);
}

export async function getGroupDetail(groupId: string, userId: string) {
  await assertGroupMember(groupId, userId);

  const db = getSupabase();
  const { data: group, error } = await db.from('groups').select('*').eq('id', groupId).single();
  if (error || !group) throw notFound('Group not found');
  if (group.is_archived) throw notFound('Group not found');

  const { data: members } = await db
    .from('group_members')
    .select('*, user:users(*)')
    .eq('group_id', groupId);

  const { data: balances } = await db.from('group_balances').select('*').eq('group_id', groupId);

  return {
    group: rowToGroup(group),
    members: (members ?? []) as GroupMember[],
    balances: (balances ?? []) as GroupBalance[],
  };
}

export async function updateGroup(
  groupId: string,
  userId: string,
  updates: { name?: string; description?: string | null; is_archived?: boolean },
): Promise<Group> {
  await assertGroupMember(groupId, userId);

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.name !== undefined) {
    payload.name = validateGroupName(updates.name);
  }
  if (updates.description !== undefined) {
    payload.description = validateGroupDescription(updates.description);
  }
  if (updates.is_archived !== undefined) {
    payload.is_archived = updates.is_archived;
  }

  const { data, error } = await getSupabase()
    .from('groups')
    .update(payload)
    .eq('id', groupId)
    .select('*')
    .single();

  if (error || !data) throw notFound('Group not found');
  return rowToGroup(data);
}

async function insertGroupMember(
  groupId: string,
  user: User,
): Promise<GroupMember & { user: User }> {
  const { data: existing } = await getSupabase()
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) throw badRequest('User is already a member of this group');

  const { data: member, error } = await getSupabase()
    .from('group_members')
    .insert({ group_id: groupId, user_id: user.id, role: 'member' })
    .select('*, user:users(*)')
    .single();

  if (error) throw error;
  return member as GroupMember & { user: User };
}

export async function addGroupMember(
  groupId: string,
  requesterId: string,
  targetUserId: string,
): Promise<GroupMember & { user: User }> {
  await assertGroupMember(groupId, requesterId);

  if (targetUserId === requesterId) {
    throw badRequest('You are already in this group');
  }

  await assertAreFriends(requesterId, targetUserId);
  const user = await getUserById(targetUserId);

  const member = await insertGroupMember(groupId, user);
  notifyGroupMemberAdded(groupId, targetUserId, requesterId);
  return member;
}

/** @deprecated Use addGroupMember with user_id */
export async function addMemberByWallet(
  groupId: string,
  requesterId: string,
  _walletAddress: string,
): Promise<GroupMember & { user: User }> {
  throw badRequest('Adding members by wallet is no longer supported. Send a friend request first.');
}

export async function removeMember(
  groupId: string,
  requesterId: string,
  targetUserId: string,
): Promise<void> {
  await assertGroupMember(groupId, requesterId);

  const { error } = await getSupabase()
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', targetUserId);

  if (error) throw error;
}

export async function getInviteLink(groupId: string, userId: string) {
  await assertGroupMember(groupId, userId);

  const { data: group } = await getSupabase()
    .from('groups')
    .select('invite_code')
    .eq('id', groupId)
    .single();

  if (!group?.invite_code) throw notFound('Group not found');

  const baseUrl = env.nodeEnv === 'production' ? 'https://splitsol.app' : 'http://localhost:8081';
  return { invite_url: `${baseUrl}/join/${group.invite_code}`, invite_code: group.invite_code };
}

export async function joinGroupByInvite(userId: string, inviteCode: string) {
  const { data: group } = await getSupabase()
    .from('groups')
    .select('*')
    .eq('invite_code', inviteCode)
    .eq('is_archived', false)
    .maybeSingle();

  if (!group) throw notFound('Invalid invite code');

  const { data: existing } = await getSupabase()
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    await getSupabase().from('group_members').insert({
      group_id: group.id,
      user_id: userId,
      role: 'member',
    });
    notifyGroupJoined(group.id as string, userId);
  }

  return getGroupDetail(group.id, userId);
}
