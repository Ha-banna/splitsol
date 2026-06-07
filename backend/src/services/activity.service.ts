import { getSupabase } from '../lib/supabase';
import { ActivityEvent } from '../types';

export async function getActivityFeed(userId: string, limit = 20, offset = 0) {
  const db = getSupabase();

  const { data: memberships } = await db
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);

  const groupIds = (memberships ?? []).map((m) => m.group_id as string);
  if (groupIds.length === 0) {
    return { events: [], total: 0, limit, offset };
  }

  const { data: groups } = await db
    .from('groups')
    .select('id, name')
    .in('id', groupIds)
    .eq('is_archived', false);

  const activeGroupIds = (groups ?? []).map((g) => g.id as string);
  if (activeGroupIds.length === 0) {
    return { events: [], total: 0, limit, offset };
  }

  const groupNames = new Map((groups ?? []).map((g) => [g.id as string, g.name as string]));

  const events: ActivityEvent[] = [];

  const { data: expenses } = await db
    .from('expenses')
    .select(
      'id, group_id, description, amount_usdc, created_at, created_by, payer:users!paid_by(display_name, avatar_url)',
    )
    .in('group_id', activeGroupIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1000);

  for (const e of expenses ?? []) {
    const payer = e.payer as { display_name?: string; avatar_url?: string | null } | null;
    events.push({
      id: `expense-${e.id}`,
      type: 'expense_added',
      group_id: e.group_id as string,
      group_name: groupNames.get(e.group_id as string) ?? 'Group',
      actor_id: e.created_by as string,
      actor_name: payer?.display_name ?? null,
      actor_avatar_url: payer?.avatar_url ?? null,
      description: e.description as string,
      amount_usdc: Number(e.amount_usdc),
      created_at: e.created_at as string,
    });
  }

  const { data: settlements } = await db
    .from('settlements')
    .select(
      'id, group_id, total_amount_usdc, created_at, paid_by, payer:users!paid_by(display_name, avatar_url)',
    )
    .in('group_id', activeGroupIds)
    .order('created_at', { ascending: false })
    .limit(1000);

  for (const s of settlements ?? []) {
    const payer = s.payer as { display_name?: string; avatar_url?: string | null } | null;
    events.push({
      id: `settlement-${s.id}`,
      type: 'settlement_completed',
      group_id: s.group_id as string,
      group_name: groupNames.get(s.group_id as string) ?? 'Group',
      actor_id: s.paid_by as string,
      actor_name: payer?.display_name ?? null,
      actor_avatar_url: payer?.avatar_url ?? null,
      description: 'Settled up',
      amount_usdc: Number(s.total_amount_usdc),
      created_at: s.created_at as string,
    });
  }

  events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const paginated = events.slice(offset, offset + limit);
  return { events: paginated, total: events.length, limit, offset };
}
