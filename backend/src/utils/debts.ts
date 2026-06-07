import { GroupBalance, SimplifiedDebt } from '../types';

const DUST = 0.001;

export function simplifyDebts(balances: GroupBalance[]): SimplifiedDebt[] {
  const transfers: SimplifiedDebt[] = [];

  const creditors = balances
    .filter((b) => b.net_balance_usdc > DUST)
    .map((b) => ({ ...b, net_balance_usdc: Number(b.net_balance_usdc) }))
    .sort((a, b) => b.net_balance_usdc - a.net_balance_usdc);

  const debtors = balances
    .filter((b) => b.net_balance_usdc < -DUST)
    .map((b) => ({ ...b, net_balance_usdc: Number(b.net_balance_usdc) }))
    .sort((a, b) => a.net_balance_usdc - b.net_balance_usdc);

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];

    let amount = Math.min(creditor.net_balance_usdc, Math.abs(debtor.net_balance_usdc));
    amount = Math.round(amount * 1_000_000) / 1_000_000;

    if (amount > DUST) {
      transfers.push({
        from_user_id: debtor.user_id,
        to_user_id: creditor.user_id,
        from_wallet: debtor.wallet_address,
        to_wallet: creditor.wallet_address,
        amount_usdc: amount,
      });
    }

    creditor.net_balance_usdc -= amount;
    debtor.net_balance_usdc += amount;

    if (Math.abs(creditor.net_balance_usdc) < DUST) ci++;
    if (Math.abs(debtor.net_balance_usdc) < DUST) di++;
  }

  return transfers;
}
