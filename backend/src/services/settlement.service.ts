import { getSupabase } from '../lib/supabase';
import { parseWalletAddress } from '../lib/solana-auth';
import {
  verifyPeerTransferTransaction,
  verifySettlementTransaction,
} from '../lib/tx-verification';
import { badRequest } from '../utils/errors';
import { notifySettlementReceived } from './notification.service';
import { assertGroupMember } from './group.service';
import { getGroupBalances, getSimplifiedDebtsForGroup } from './balance.service';
import { getUserById } from './user.service';
import {
  assertSufficientUsdcBalance,
  buildSettlementTransaction,
  debtsForPayer,
  isSolanaRpcFailure,
  PLATFORM_FEE_USDC,
  serializeTransaction,
} from './solana.service';
import { env, isSolanaConfigured } from '../config/env';
import { AppError } from '../utils/errors';

function devSettlementPrepareResponse(
  debts: Array<{ to_wallet: string; amount_usdc: number; to_user_id: string }>,
  total_usdc: number,
) {
  return {
    debts: debts.map((d) => ({ to_wallet: d.to_wallet, amount_usdc: d.amount_usdc })),
    platform_fee_usdc: PLATFORM_FEE_USDC,
    total_usdc,
    serialized_transaction: '',
    dev_mode: true,
  };
}

export async function prepareSettlement(
  groupId: string,
  userId: string,
  payerWalletAddress: string,
) {
  await assertGroupMember(groupId, userId);

  const user = await getUserById(userId);
  const payer = parseWalletAddress(payerWalletAddress);
  if (parseWalletAddress(user.wallet_address) !== payer) {
    throw badRequest('payer_wallet_address must match your account wallet');
  }

  const fullDebts = await getSimplifiedDebtsForGroup(groupId, userId);
  const debts = debtsForPayer(fullDebts, userId, payerWalletAddress);

  if (debts.length === 0) {
    throw badRequest('You have no debts to settle in this group');
  }

  const debtTotal = debts.reduce((sum, d) => sum + d.amount_usdc, 0);
  const total_usdc =
    Math.round((debtTotal + PLATFORM_FEE_USDC) * 1_000_000) / 1_000_000;

  if (!isSolanaConfigured()) {
    if (env.isProduction) {
      throw badRequest('Settlement is not available: Solana RPC not configured');
    }
    return devSettlementPrepareResponse(debts, total_usdc);
  }

  try {
    await assertSufficientUsdcBalance(payerWalletAddress, total_usdc);

    const { transaction, total_usdc: builtTotal, platform_fee_usdc, min_context_slot } =
      await buildSettlementTransaction(payerWalletAddress, debts);

    return {
      debts: debts.map((d) => ({ to_wallet: d.to_wallet, amount_usdc: d.amount_usdc })),
      platform_fee_usdc,
      total_usdc: builtTotal,
      serialized_transaction: serializeTransaction(transaction),
      min_context_slot,
      dev_mode: false,
    };
  } catch (error) {
    if (!env.isProduction && isSolanaRpcFailure(error)) {
      console.warn('[settlement] Solana RPC unavailable — using dev mock mode');
      return devSettlementPrepareResponse(debts, total_usdc);
    }
    if (error instanceof AppError) throw error;
    throw error;
  }
}

export async function confirmSettlement(
  groupId: string,
  userId: string,
  txSignature: string,
) {
  await assertGroupMember(groupId, userId);

  const isDevMock = !env.isProduction && txSignature.startsWith('devmock_');

  const payerDebts = (await getSimplifiedDebtsForGroup(groupId, userId)).filter(
    (d) => d.from_user_id === userId,
  );

  if (!isDevMock) {
    if (!isSolanaConfigured()) {
      throw badRequest('On-chain settlement required but Solana RPC is not configured');
    }
    const user = await getUserById(userId);
    await verifySettlementTransaction(
      txSignature,
      user.wallet_address,
      payerDebts.map((d) => ({ to_wallet: d.to_wallet, amount_usdc: d.amount_usdc })),
    );
  }

  const { data: existing } = await getSupabase()
    .from('settlements')
    .select('id')
    .eq('tx_signature', txSignature)
    .maybeSingle();

  if (existing) {
    throw badRequest('Settlement already recorded');
  }

  const debtTotal = payerDebts.reduce((sum, d) => sum + d.amount_usdc, 0);
  const totalAmount = debtTotal + PLATFORM_FEE_USDC;

  const { data: settlement, error } = await getSupabase()
    .from('settlements')
    .insert({
      group_id: groupId,
      paid_by: userId,
      total_amount_usdc: totalAmount,
      platform_fee_usdc: PLATFORM_FEE_USDC,
      tx_signature: txSignature,
      tx_confirmed_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;

  if (payerDebts.length > 0) {
    await getSupabase().from('settlement_transfers').insert(
      payerDebts.map((d) => ({
        settlement_id: settlement.id,
        from_user: userId,
        to_user: d.to_user_id,
        amount_usdc: d.amount_usdc,
      })),
    );
    for (const d of payerDebts) {
      notifySettlementReceived(groupId, d.to_user_id, userId, d.amount_usdc);
    }
  }

  const updated_balances = await getGroupBalances(groupId, userId);

  return { settlement, updated_balances };
}

export async function listSettlements(groupId: string, userId: string) {
  await assertGroupMember(groupId, userId);

  const { data, error } = await getSupabase()
    .from('settlements')
    .select('*, transfers:settlement_transfers(*)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
