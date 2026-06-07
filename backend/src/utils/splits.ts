import { badRequest } from './errors';
import { SplitType } from '../types';

export interface SplitInput {
  user_id: string;
  amount?: number;
  percentage?: number;
}

export function calculateSplits(
  splitType: SplitType,
  amountUsdc: number,
  paidByUserId: string,
  memberIds: string[],
  splits?: SplitInput[],
): Array<{ user_id: string; amount_owed: number; percentage: number | null }> {
  const members = memberIds.filter((id) => id !== paidByUserId);

  if (splitType === 'single') {
    if (members.length !== 1) {
      throw badRequest('Single split requires exactly one other member');
    }
    return [{ user_id: members[0], amount_owed: roundUsdc(amountUsdc), percentage: null }];
  }

  if (splitType === 'equal') {
    const share = roundUsdc(amountUsdc / memberIds.length);
    return memberIds
      .filter((id) => id !== paidByUserId)
      .map((user_id) => ({ user_id, amount_owed: share, percentage: null }));
  }

  if (!splits?.length) {
    throw badRequest('Splits array is required for exact and percentage split types');
  }

  if (splitType === 'exact') {
    const total = splits.reduce((sum, s) => sum + (s.amount ?? 0), 0);
    if (Math.abs(total - amountUsdc) > 0.01) {
      throw badRequest('Split amounts must sum to the expense total');
    }
    return splits.map((s) => ({
      user_id: s.user_id,
      amount_owed: roundUsdc(s.amount ?? 0),
      percentage: null,
    }));
  }

  if (splitType === 'percentage') {
    const totalPct = splits.reduce((sum, s) => sum + (s.percentage ?? 0), 0);
    if (Math.abs(totalPct - 100) > 0.01) {
      throw badRequest('Split percentages must sum to 100');
    }
    return splits.map((s) => ({
      user_id: s.user_id,
      amount_owed: roundUsdc((amountUsdc * (s.percentage ?? 0)) / 100),
      percentage: s.percentage ?? null,
    }));
  }

  throw badRequest('Invalid split type');
}

function roundUsdc(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
