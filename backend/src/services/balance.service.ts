import { getSupabase } from '../lib/supabase';
import { GroupBalance, SimplifiedDebt } from '../types';
import { simplifyDebts } from '../utils/debts';
import { assertGroupMember } from './group.service';

async function fetchGroupBalances(groupId: string): Promise<GroupBalance[]> {
  const { data: balances, error } = await getSupabase()
    .from('group_balances')
    .select('*')
    .eq('group_id', groupId);

  if (error) throw error;
  return (balances ?? []) as GroupBalance[];
}

export async function getGroupBalances(groupId: string, userId: string) {
  await assertGroupMember(groupId, userId);
  const balances = await fetchGroupBalances(groupId);

  const userIds = [...new Set(balances.map((b) => b.user_id))];
  const profileByUserId = new Map<
    string,
    { avatar_url: string | null; username: string | null }
  >();

  if (userIds.length > 0) {
    const { data: users, error } = await getSupabase()
      .from('users')
      .select('id, avatar_url, username')
      .in('id', userIds);
    if (error) throw error;
    for (const u of users ?? []) {
      profileByUserId.set(u.id as string, {
        avatar_url: (u.avatar_url as string | null) ?? null,
        username: (u.username as string | null) ?? null,
      });
    }
  }

  const members = balances.map((b) => {
    const profile = profileByUserId.get(b.user_id);
    return {
      user_id: b.user_id,
      display_name: b.display_name,
      wallet_address: b.wallet_address,
      avatar_url: profile?.avatar_url ?? null,
      username: profile?.username ?? null,
      net_balance_usdc: Number(b.net_balance_usdc),
    };
  });

  const simplified = simplifyDebts(balances);

  return {
    members,
    simplified_debts: simplified.map((d) => ({
      from_user_id: d.from_user_id,
      to_user_id: d.to_user_id,
      amount_usdc: d.amount_usdc,
    })),
  };
}

export async function getSimplifiedDebtsForGroup(
  groupId: string,
  userId: string,
): Promise<SimplifiedDebt[]> {
  await assertGroupMember(groupId, userId);
  return simplifyDebts(await fetchGroupBalances(groupId));
}

export async function getUserSummaryBalances(userId: string) {
  const { data, error } = await getSupabase()
    .from('group_balances')
    .select('net_balance_usdc')
    .eq('user_id', userId);

  if (error) throw error;

  let totalOwedToMe = 0;
  let totalIOwe = 0;

  for (const row of data ?? []) {
    const balance = Number(row.net_balance_usdc);
    if (balance > 0) totalOwedToMe += balance;
    if (balance < 0) totalIOwe += Math.abs(balance);
  }

  return {
    you_are_owed: Math.round(totalOwedToMe * 100) / 100,
    you_owe: Math.round(totalIOwe * 100) / 100,
  };
}
