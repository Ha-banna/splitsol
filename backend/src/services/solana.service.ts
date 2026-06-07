import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError,
} from '@solana/spl-token';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { env, isSolanaConfigured } from '../config/env';
import { SimplifiedDebt } from '../types';
import { AppError, badRequest, solanaRpcError } from '../utils/errors';

const PLATFORM_FEE_USDC = 0.25;
const USDC_DECIMALS = 1_000_000;

export { PLATFORM_FEE_USDC };

/** True when Helius/RPC rejected the call (bad key, auth, unreachable). */
export function isSolanaRpcError(error: unknown): boolean {
  if (error instanceof AppError) return false;
  const msg = error instanceof Error ? error.message : String(error);
  return /401|403|invalid api key|Unauthorized|fetch failed|ECONNREFUSED|ENOTFOUND|ECONNRESET|ETIMEDOUT/i.test(
    msg,
  );
}

/** RPC failure from raw errors or solanaRpcError AppError — used for dev mock fallback. */
export function isSolanaRpcFailure(error: unknown): boolean {
  if (error instanceof AppError && error.code === 'SOLANA_RPC_ERROR') return true;
  return isSolanaRpcError(error);
}

function rethrowSolanaRpcError(error: unknown): never {
  if (error instanceof AppError) throw error;
  if (isSolanaRpcError(error)) {
    throw solanaRpcError();
  }
  throw error;
}

async function withSolanaRpc<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    rethrowSolanaRpcError(error);
  }
}

/** USDC balance for a wallet (0 if no token account). */
export async function getUsdcBalance(walletAddress: string): Promise<number> {
  return withSolanaRpc(async () => {
    const connection = getConnection();
    const usdcMint = new PublicKey(env.usdcMintAddress);
    const owner = new PublicKey(walletAddress);
    const ata = await getAssociatedTokenAddress(usdcMint, owner);
    try {
      const account = await getAccount(connection, ata);
      return Number(account.amount) / USDC_DECIMALS;
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) return 0;
      throw error;
    }
  });
}

export async function assertSufficientUsdcBalance(
  walletAddress: string,
  requiredUsdc: number,
): Promise<void> {
  const balance = await getUsdcBalance(walletAddress);
  const required = Math.round(requiredUsdc * 1_000_000) / 1_000_000;
  if (balance + 0.000001 < required) {
    throw badRequest(
      `Insufficient USDC. You have $${balance.toFixed(2)} but need $${required.toFixed(2)} (including fees).`,
    );
  }
}

export function getConnection(): Connection {
  if (!isSolanaConfigured()) {
    throw badRequest('Solana RPC is not configured');
  }
  return new Connection(env.heliusRpcUrl, 'confirmed');
}

async function ataExists(connection: Connection, ata: PublicKey): Promise<boolean> {
  try {
    await getAccount(connection, ata);
    return true;
  } catch (error) {
    if (error instanceof TokenAccountNotFoundError) return false;
    throw error;
  }
}

export async function buildSettlementTransaction(
  payerWallet: string,
  debts: Array<{ to_wallet: string; amount_usdc: number }>,
): Promise<{
  transaction: Transaction;
  total_usdc: number;
  platform_fee_usdc: number;
  min_context_slot: number;
}> {
  return withSolanaRpc(async () => {
    const connection = getConnection();
    const usdcMint = new PublicKey(env.usdcMintAddress);
    const platformWallet = new PublicKey(env.platformWalletAddress);
    const payer = new PublicKey(payerWallet);

    const transaction = new Transaction();
    const payerTokenAccount = await getAssociatedTokenAddress(usdcMint, payer);

    const platformTokenAccount = await getAssociatedTokenAddress(usdcMint, platformWallet);
    const platformNeedsAta = !(await ataExists(connection, platformTokenAccount));
    if (platformNeedsAta) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          payer,
          platformTokenAccount,
          platformWallet,
          usdcMint,
        ),
      );
    }

    transaction.add(
      createTransferInstruction(
        payerTokenAccount,
        platformTokenAccount,
        payer,
        Math.round(PLATFORM_FEE_USDC * USDC_DECIMALS),
        [],
        TOKEN_PROGRAM_ID,
      ),
    );

    let debtTotal = 0;
    for (const debt of debts) {
      const recipient = new PublicKey(debt.to_wallet);
      const recipientTokenAccount = await getAssociatedTokenAddress(usdcMint, recipient);
      const amount = Math.round(debt.amount_usdc * USDC_DECIMALS);
      debtTotal += debt.amount_usdc;

      if (!(await ataExists(connection, recipientTokenAccount))) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            payer,
            recipientTokenAccount,
            recipient,
            usdcMint,
          ),
        );
      }

      transaction.add(
        createTransferInstruction(
          payerTokenAccount,
          recipientTokenAccount,
          payer,
          amount,
          [],
          TOKEN_PROGRAM_ID,
        ),
      );
    }

    const minContextSlot = await connection.getSlot('confirmed');
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer;

    return {
      transaction,
      total_usdc: Math.round((debtTotal + PLATFORM_FEE_USDC) * 1_000_000) / 1_000_000,
      platform_fee_usdc: PLATFORM_FEE_USDC,
      min_context_slot: minContextSlot,
    };
  });
}

export async function buildPeerTransferTransaction(
  payerWallet: string,
  recipientWallet: string,
  amountUsdc: number,
): Promise<{ transaction: Transaction; total_usdc: number; min_context_slot: number }> {
  return withSolanaRpc(async () => {
    const connection = getConnection();
    const usdcMint = new PublicKey(env.usdcMintAddress);
    const payer = new PublicKey(payerWallet);
    const recipient = new PublicKey(recipientWallet);

    const transaction = new Transaction();
    const payerTokenAccount = await getAssociatedTokenAddress(usdcMint, payer);
    const recipientTokenAccount = await getAssociatedTokenAddress(usdcMint, recipient);
    const amount = Math.round(amountUsdc * USDC_DECIMALS);

    if (!(await ataExists(connection, recipientTokenAccount))) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          payer,
          recipientTokenAccount,
          recipient,
          usdcMint,
        ),
      );
    }

    transaction.add(
      createTransferInstruction(
        payerTokenAccount,
        recipientTokenAccount,
        payer,
        amount,
        [],
        TOKEN_PROGRAM_ID,
      ),
    );

    const minContextSlot = await connection.getSlot('confirmed');
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer;

    return { transaction, total_usdc: amountUsdc, min_context_slot: minContextSlot };
  });
}

export function serializeTransaction(transaction: Transaction): string {
  return transaction.serialize({ requireAllSignatures: false }).toString('base64');
}

export function debtsForPayer(
  simplifiedDebts: SimplifiedDebt[],
  payerUserId: string,
  payerWallet: string,
): Array<{ to_wallet: string; amount_usdc: number; to_user_id: string }> {
  return simplifiedDebts
    .filter((d) => d.from_user_id === payerUserId)
    .map((d) => ({
      to_wallet: d.to_wallet,
      to_user_id: d.to_user_id,
      amount_usdc: d.amount_usdc,
    }));
}
