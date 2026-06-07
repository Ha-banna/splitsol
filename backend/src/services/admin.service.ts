import { getSupabase } from '../lib/supabase';
import { badRequest } from '../utils/errors';
import { assertSupabaseConfigured, env, isSupabaseConfigured } from '../config/env';
import { getFeedbackSummary } from './feedback.service';

export type AdminPeriodStats = {
  revenue_usdc: number;
  settlements: number;
  peer_transfers: number;
  transactions: number;
  volume_usdc: number;
  new_users: number;
  expenses: number;
  expense_volume_usdc: number;
};

export type AdminRecentItem = {
  type: 'settlement' | 'peer_transfer';
  id: string;
  amount_usdc: number;
  platform_fee_usdc: number | null;
  created_at: string;
  tx_signature: string;
  label: string;
};

export type AdminStats = {
  generated_at: string;
  platform: {
    wallet_address: string | null;
    fee_per_settlement_usdc: number;
  };
  revenue: {
    total_usdc: number;
    settlement_count: number;
    on_chain_settlements: number;
    dev_mock_settlements: number;
  };
  transactions: {
    total: number;
    settlements: number;
    peer_transfers: number;
    on_chain: number;
    dev_mock: number;
    total_volume_usdc: number;
    settlement_volume_usdc: number;
    peer_volume_usdc: number;
  };
  users: {
    total: number;
    with_username: number;
    with_push_token: number;
    active_7d: number;
    active_30d: number;
    new_7d: number;
    new_30d: number;
  };
  social: {
    friend_links: number;
    mutual_friend_pairs: number;
    pending_friend_requests: number;
  };
  groups: {
    total: number;
    active: number;
    archived: number;
    total_memberships: number;
  };
  expenses: {
    total: number;
    active: number;
    deleted: number;
    total_volume_usdc: number;
  };
  periods: {
    last_7d: AdminPeriodStats;
    last_30d: AdminPeriodStats;
  };
  feedback: {
    total: number;
    bugs: number;
    suggestions: number;
    other: number;
    last_7d: number;
  };
  recent: AdminRecentItem[];
};

const PLATFORM_FEE_USDC = 0.25;

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function sumNumbers(values: (number | string | null | undefined)[]): number {
  return values.reduce<number>((acc, v) => acc + (Number(v) || 0), 0);
}

function isDevMockTx(tx: string | null | undefined): boolean {
  return typeof tx === 'string' && tx.startsWith('devmock_');
}

function headCountQuery(table: string) {
  return getSupabase().from(table).select('*', { count: 'exact', head: true });
}

type HeadCountQuery = ReturnType<typeof headCountQuery>;

async function countTable(
  table: string,
  filter?: (q: HeadCountQuery) => HeadCountQuery,
): Promise<number> {
  let q = headCountQuery(table);
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

async function activeUserCount(sinceIso: string): Promise<number> {
  const db = getSupabase();
  const ids = new Set<string>();

  const add = (value: string | null | undefined) => {
    if (value) ids.add(value);
  };

  const [
    expenseRows,
    settlementRows,
    transferRows,
    groupRows,
    requestRows,
    updatedUsers,
  ] = await Promise.all([
    db
      .from('expenses')
      .select('created_by, paid_by')
      .gte('created_at', sinceIso)
      .is('deleted_at', null),
    db.from('settlements').select('paid_by').gte('created_at', sinceIso),
    db.from('peer_transfers').select('from_user_id, to_user_id').gte('created_at', sinceIso),
    db.from('groups').select('created_by').gte('created_at', sinceIso),
    db
      .from('friend_requests')
      .select('from_user_id, to_user_id')
      .gte('created_at', sinceIso),
    db.from('users').select('id').gte('updated_at', sinceIso),
  ]);

  for (const row of expenseRows.data ?? []) {
    add(row.created_by as string);
    add(row.paid_by as string);
  }
  for (const row of settlementRows.data ?? []) add(row.paid_by as string);
  for (const row of transferRows.data ?? []) {
    add(row.from_user_id as string);
    add(row.to_user_id as string);
  }
  for (const row of groupRows.data ?? []) add(row.created_by as string);
  for (const row of requestRows.data ?? []) {
    add(row.from_user_id as string);
    add(row.to_user_id as string);
  }
  for (const row of updatedUsers.data ?? []) add(row.id as string);

  return ids.size;
}

async function periodStats(sinceIso: string): Promise<AdminPeriodStats> {
  const db = getSupabase();

  const [settlements, transfers, expenses, newUsers] = await Promise.all([
    db.from('settlements').select('platform_fee_usdc, total_amount_usdc, created_at').gte('created_at', sinceIso),
    db.from('peer_transfers').select('amount_usdc, created_at').gte('created_at', sinceIso),
    db
      .from('expenses')
      .select('amount_usdc, created_at')
      .gte('created_at', sinceIso)
      .is('deleted_at', null),
    db.from('users').select('id').gte('created_at', sinceIso),
  ]);

  if (settlements.error) throw settlements.error;
  if (transfers.error) throw transfers.error;
  if (expenses.error) throw expenses.error;
  if (newUsers.error) throw newUsers.error;

  const settlementRows = settlements.data ?? [];
  const transferRows = transfers.data ?? [];
  const expenseRows = expenses.data ?? [];

  const settlementVolume = sumNumbers(settlementRows.map((r) => r.total_amount_usdc));
  const peerVolume = sumNumbers(transferRows.map((r) => r.amount_usdc));

  return {
    revenue_usdc: sumNumbers(settlementRows.map((r) => r.platform_fee_usdc)),
    settlements: settlementRows.length,
    peer_transfers: transferRows.length,
    transactions: settlementRows.length + transferRows.length,
    volume_usdc: settlementVolume + peerVolume,
    new_users: (newUsers.data ?? []).length,
    expenses: expenseRows.length,
    expense_volume_usdc: sumNumbers(expenseRows.map((r) => r.amount_usdc)),
  };
}

export async function getAdminStats(): Promise<AdminStats> {
  if (!isSupabaseConfigured()) {
    throw badRequest('Supabase is not configured');
  }
  assertSupabaseConfigured();

  const db = getSupabase();

  const [
    allSettlements,
    allTransfers,
    allExpenses,
    settlementTransferRows,
    recentSettlements,
    recentTransfers,
    active7d,
    active30d,
    period7d,
    period30d,
    feedbackSummary,
  ] = await Promise.all([
    db.from('settlements').select('platform_fee_usdc, total_amount_usdc, tx_signature'),
    db.from('peer_transfers').select('amount_usdc, tx_signature'),
    db.from('expenses').select('amount_usdc, deleted_at'),
    db.from('settlement_transfers').select('amount_usdc'),
    db
      .from('settlements')
      .select('id, total_amount_usdc, platform_fee_usdc, tx_signature, created_at, paid_by')
      .order('created_at', { ascending: false })
      .limit(8),
    db
      .from('peer_transfers')
      .select('id, amount_usdc, tx_signature, created_at, from_user_id, to_user_id')
      .order('created_at', { ascending: false })
      .limit(8),
    activeUserCount(daysAgoIso(7)),
    activeUserCount(daysAgoIso(30)),
    periodStats(daysAgoIso(7)),
    periodStats(daysAgoIso(30)),
    getFeedbackSummary(),
  ]);

  if (allSettlements.error) throw allSettlements.error;
  if (allTransfers.error) throw allTransfers.error;
  if (allExpenses.error) throw allExpenses.error;
  if (settlementTransferRows.error) throw settlementTransferRows.error;

  const settlementData = allSettlements.data ?? [];
  const transferData = allTransfers.data ?? [];
  const expenseData = allExpenses.data ?? [];

  const settlementVolume = sumNumbers(settlementData.map((r) => r.total_amount_usdc));
  const settlementTransferVolume = sumNumbers(
    (settlementTransferRows.data ?? []).map((r) => r.amount_usdc),
  );
  const peerVolume = sumNumbers(transferData.map((r) => r.amount_usdc));

  const allTxs = [
    ...settlementData.map((r) => r.tx_signature as string),
    ...transferData.map((r) => r.tx_signature as string),
  ];
  const devMockCount = allTxs.filter(isDevMockTx).length;

  const [
    totalUsers,
    usersWithUsername,
    usersWithPush,
    newUsers7d,
    newUsers30d,
    friendLinks,
    pendingRequests,
    totalGroups,
    activeGroups,
    archivedGroups,
    memberships,
  ] = await Promise.all([
    countTable('users'),
    countTable('users', (q) => q.not('username', 'is', null)),
    countTable('users', (q) => q.not('push_token', 'is', null)),
    countTable('users', (q) => q.gte('created_at', daysAgoIso(7))),
    countTable('users', (q) => q.gte('created_at', daysAgoIso(30))),
    countTable('user_contacts'),
    countTable('friend_requests', (q) => q.eq('status', 'pending')),
    countTable('groups'),
    countTable('groups', (q) => q.eq('is_archived', false)),
    countTable('groups', (q) => q.eq('is_archived', true)),
    countTable('group_members'),
  ]);

  const activeExpenses = expenseData.filter((e) => !e.deleted_at);
  const deletedExpenses = expenseData.filter((e) => e.deleted_at);

  const recent: AdminRecentItem[] = [
    ...(recentSettlements.data ?? []).map((row) => ({
      type: 'settlement' as const,
      id: row.id as string,
      amount_usdc: Number(row.total_amount_usdc),
      platform_fee_usdc: Number(row.platform_fee_usdc),
      created_at: row.created_at as string,
      tx_signature: row.tx_signature as string,
      label: 'Group settlement',
    })),
    ...(recentTransfers.data ?? []).map((row) => ({
      type: 'peer_transfer' as const,
      id: row.id as string,
      amount_usdc: Number(row.amount_usdc),
      platform_fee_usdc: null,
      created_at: row.created_at as string,
      tx_signature: row.tx_signature as string,
      label: 'Peer USDC send',
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 12);

  return {
    generated_at: new Date().toISOString(),
    platform: {
      wallet_address: env.platformWalletAddress || null,
      fee_per_settlement_usdc: PLATFORM_FEE_USDC,
    },
    revenue: {
      total_usdc: sumNumbers(settlementData.map((r) => r.platform_fee_usdc)),
      settlement_count: settlementData.length,
      on_chain_settlements: settlementData.filter((r) => !isDevMockTx(r.tx_signature as string))
        .length,
      dev_mock_settlements: settlementData.filter((r) => isDevMockTx(r.tx_signature as string))
        .length,
    },
    transactions: {
      total: settlementData.length + transferData.length,
      settlements: settlementData.length,
      peer_transfers: transferData.length,
      on_chain: allTxs.length - devMockCount,
      dev_mock: devMockCount,
      total_volume_usdc: settlementVolume + peerVolume,
      settlement_volume_usdc: settlementTransferVolume,
      peer_volume_usdc: peerVolume,
    },
    users: {
      total: totalUsers,
      with_username: usersWithUsername,
      with_push_token: usersWithPush,
      active_7d: active7d,
      active_30d: active30d,
      new_7d: newUsers7d,
      new_30d: newUsers30d,
    },
    social: {
      friend_links: friendLinks,
      mutual_friend_pairs: Math.floor(friendLinks / 2),
      pending_friend_requests: pendingRequests,
    },
    groups: {
      total: totalGroups,
      active: activeGroups,
      archived: archivedGroups,
      total_memberships: memberships,
    },
    expenses: {
      total: expenseData.length,
      active: activeExpenses.length,
      deleted: deletedExpenses.length,
      total_volume_usdc: sumNumbers(activeExpenses.map((e) => e.amount_usdc)),
    },
    periods: {
      last_7d: period7d,
      last_30d: period30d,
    },
    feedback: feedbackSummary,
    recent,
  };
}
