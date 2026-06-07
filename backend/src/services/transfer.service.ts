import { getSupabase } from '../lib/supabase';
import { verifyPeerTransferTransaction } from '../lib/tx-verification';
import { badRequest } from '../utils/errors';
import { notifyPeerTransferReceived } from './notification.service';
import { getUserById, getUserByUsername } from './user.service';
import {
  assertSufficientUsdcBalance,
  buildPeerTransferTransaction,
  isSolanaRpcFailure,
  serializeTransaction,
} from './solana.service';
import { env, isSolanaConfigured } from '../config/env';
import { AppError } from '../utils/errors';

function devTransferPrepareResponse(
  toUser: Awaited<ReturnType<typeof getUserById>>,
  amount: number,
  note?: string,
) {
  return {
    to_user: {
      id: toUser.id,
      username: toUser.username,
      display_name: toUser.display_name,
      wallet_address: toUser.wallet_address,
      avatar_url: toUser.avatar_url,
    },
    amount_usdc: amount,
    note: note?.trim() || null,
    total_usdc: amount,
    serialized_transaction: '',
    dev_mode: true,
  };
}

export async function preparePeerTransfer(
  fromUserId: string,
  input: { to_user_id?: string; to_username?: string; amount_usdc: number; note?: string },
) {
  const amount = Number(input.amount_usdc);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw badRequest('amount_usdc must be a positive number');
  }
  if (amount > 10_000) {
    throw badRequest('amount_usdc exceeds maximum per transfer');
  }

  let toUser;
  if (input.to_user_id) {
    toUser = await getUserById(input.to_user_id);
  } else if (input.to_username) {
    toUser = await getUserByUsername(input.to_username);
  } else {
    throw badRequest('to_user_id or to_username is required');
  }

  if (toUser.id === fromUserId) {
    throw badRequest('You cannot send to yourself');
  }

  const fromUser = await getUserById(fromUserId);

  if (!isSolanaConfigured()) {
    if (env.isProduction) {
      throw badRequest('Transfers are not available: Solana RPC not configured');
    }
    return devTransferPrepareResponse(toUser, amount, input.note);
  }

  try {
    await assertSufficientUsdcBalance(fromUser.wallet_address, amount);

    const { transaction, total_usdc, min_context_slot } = await buildPeerTransferTransaction(
      fromUser.wallet_address,
      toUser.wallet_address,
      amount,
    );

    return {
      to_user: {
        id: toUser.id,
        username: toUser.username,
        display_name: toUser.display_name,
        wallet_address: toUser.wallet_address,
        avatar_url: toUser.avatar_url,
      },
      amount_usdc: amount,
      note: input.note?.trim() || null,
      total_usdc,
      serialized_transaction: serializeTransaction(transaction),
      min_context_slot,
      dev_mode: false,
    };
  } catch (error) {
    if (!env.isProduction && isSolanaRpcFailure(error)) {
      console.warn('[transfer] Solana RPC unavailable — using dev mock mode');
      return devTransferPrepareResponse(toUser, amount, input.note);
    }
    if (error instanceof AppError) throw error;
    throw error;
  }
}

export async function confirmPeerTransfer(
  fromUserId: string,
  input: {
    to_user_id: string;
    amount_usdc: number;
    tx_signature: string;
    note?: string;
  },
) {
  const amount = Number(input.amount_usdc);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw badRequest('amount_usdc must be a positive number');
  }

  const toUser = await getUserById(input.to_user_id);
  if (toUser.id === fromUserId) {
    throw badRequest('Invalid recipient');
  }

  const fromUser = await getUserById(fromUserId);

  const isDevMock = !env.isProduction && input.tx_signature.startsWith('devmock_');

  if (!isDevMock) {
    if (!isSolanaConfigured()) {
      throw badRequest('On-chain transfer required but Solana RPC is not configured');
    }
    await verifyPeerTransferTransaction(
      input.tx_signature,
      fromUser.wallet_address,
      toUser.wallet_address,
      amount,
    );
  }

  const { data: existing } = await getSupabase()
    .from('peer_transfers')
    .select('id')
    .eq('tx_signature', input.tx_signature)
    .maybeSingle();

  if (existing) {
    throw badRequest('Transfer already recorded');
  }

  const { data, error } = await getSupabase()
    .from('peer_transfers')
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUser.id,
      amount_usdc: amount,
      note: input.note?.trim() || null,
      tx_signature: input.tx_signature,
    })
    .select('*')
    .single();

  if (error) throw error;

  notifyPeerTransferReceived(toUser.id, fromUserId, amount);

  return {
    transfer: data,
    to_user: {
      id: toUser.id,
      username: toUser.username,
      display_name: toUser.display_name,
    },
  };
}
