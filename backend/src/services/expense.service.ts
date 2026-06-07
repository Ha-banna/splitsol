import { getSupabase } from '../lib/supabase';
import { Expense, SplitType } from '../types';
import { badRequest, forbidden, notFound } from '../utils/errors';
import { calculateSplits, SplitInput } from '../utils/splits';
import { notifyExpenseAdded } from './notification.service';
import { assertGroupMember } from './group.service';

function rowToExpense(row: Record<string, unknown>): Expense {
  return row as unknown as Expense;
}

export async function listExpenses(
  groupId: string,
  userId: string,
  limit = 20,
  offset = 0,
) {
  await assertGroupMember(groupId, userId);

  const { data, error, count } = await getSupabase()
    .from('expenses')
    .select('*, splits:expense_splits(*, user:users(*)), payer:users!paid_by(*)', {
      count: 'exact',
    })
    .eq('group_id', groupId)
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { expenses: (data ?? []).map(rowToExpense), total: count ?? 0, limit, offset };
}

export async function createExpense(
  groupId: string,
  userId: string,
  input: {
    description: string;
    amount: number;
    paid_by_user_id: string;
    split_type: SplitType;
    date?: string;
    note?: string;
    splits?: SplitInput[];
  },
): Promise<Expense> {
  await assertGroupMember(groupId, userId);

  const { data: members } = await getSupabase()
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);

  const memberIds = (members ?? []).map((m) => m.user_id as string);
  if (!memberIds.includes(input.paid_by_user_id)) {
    throw badRequest('Payer must be a group member');
  }

  const amountUsdc = input.amount;
  const splitRows = calculateSplits(
    input.split_type,
    amountUsdc,
    input.paid_by_user_id,
    memberIds,
    input.splits,
  );

  const { data: expense, error } = await getSupabase()
    .from('expenses')
    .insert({
      group_id: groupId,
      description: input.description.trim(),
      amount: input.amount,
      amount_usdc: amountUsdc,
      paid_by: input.paid_by_user_id,
      split_type: input.split_type,
      date: input.date ?? new Date().toISOString().slice(0, 10),
      note: input.note ?? null,
      created_by: userId,
    })
    .select('*')
    .single();

  if (error) throw error;

  const { error: splitsError } = await getSupabase().from('expense_splits').insert(
    splitRows.map((s) => ({
      expense_id: expense.id,
      user_id: s.user_id,
      amount_owed: s.amount_owed,
      percentage: s.percentage,
    })),
  );

  if (splitsError) throw splitsError;

  notifyExpenseAdded(groupId, userId, input.description.trim(), amountUsdc);

  return getExpenseById(groupId, expense.id, userId);
}

export async function getExpenseById(
  groupId: string,
  expenseId: string,
  userId: string,
): Promise<Expense> {
  await assertGroupMember(groupId, userId);

  const { data, error } = await getSupabase()
    .from('expenses')
    .select('*, splits:expense_splits(*, user:users(*)), payer:users!paid_by(*)')
    .eq('id', expenseId)
    .eq('group_id', groupId)
    .is('deleted_at', null)
    .single();

  if (error || !data) throw notFound('Expense not found');
  return rowToExpense(data);
}

export async function updateExpense(
  groupId: string,
  expenseId: string,
  userId: string,
  updates: { description?: string; amount?: number; note?: string },
): Promise<Expense> {
  await assertGroupMember(groupId, userId);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.description !== undefined) patch.description = updates.description.trim();
  if (updates.note !== undefined) patch.note = updates.note;
  if (updates.amount !== undefined) {
    patch.amount = updates.amount;
    patch.amount_usdc = updates.amount;
  }

  const { error } = await getSupabase()
    .from('expenses')
    .update(patch)
    .eq('id', expenseId)
    .eq('group_id', groupId)
    .is('deleted_at', null);

  if (error) throw error;
  return getExpenseById(groupId, expenseId, userId);
}

export async function deleteExpense(
  groupId: string,
  expenseId: string,
  userId: string,
): Promise<void> {
  await assertGroupMember(groupId, userId);

  const { data: expense } = await getSupabase()
    .from('expenses')
    .select('created_by')
    .eq('id', expenseId)
    .eq('group_id', groupId)
    .single();

  if (!expense) throw notFound('Expense not found');
  if (expense.created_by !== userId) {
    throw forbidden('Only the expense creator can delete it');
  }

  await getSupabase()
    .from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', expenseId);
}
