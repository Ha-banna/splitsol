import type { ApiGroup } from '@/types/api';

export function sumGroupBalances(groups: ApiGroup[]): {
  totalOwedToMe: number;
  totalIOwe: number;
} {
  let totalOwedToMe = 0;
  let totalIOwe = 0;

  for (const group of groups) {
    const balance = Number(group.my_balance_usdc ?? 0);
    if (!Number.isFinite(balance)) continue;
    if (balance > 0) totalOwedToMe += balance;
    if (balance < 0) totalIOwe += Math.abs(balance);
  }

  return {
    totalOwedToMe: Math.round(totalOwedToMe * 100) / 100,
    totalIOwe: Math.round(totalIOwe * 100) / 100,
  };
}

export function formatUsdcAmount(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Formats a balance with an explicit sign, e.g. +$10.00, -$4.50, $0.00 */
export function formatSignedUsdcAmount(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || Math.abs(n) < 0.000001) return '$0.00';
  const formatted = (Math.round(Math.abs(n) * 100) / 100).toFixed(2);
  if (n < 0) return `-$${formatted}`;
  return `+$${formatted}`;
}
