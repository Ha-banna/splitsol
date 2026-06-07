import type { ParsedTransactionWithMeta } from '@solana/web3.js';
import { getConnection, PLATFORM_FEE_USDC } from '../services/solana.service';
import { env } from '../config/env';
import { parseWalletAddress } from './solana-auth';
import { badRequest } from '../utils/errors';

const AMOUNT_EPSILON = 0.000001;

type TokenBalanceRow = NonNullable<
  NonNullable<ParsedTransactionWithMeta['meta']>['postTokenBalances']
>[number];

function tokenUiAmount(balance: TokenBalanceRow): number {
  const raw = BigInt(balance.uiTokenAmount.amount);
  const decimals = balance.uiTokenAmount.decimals;
  return Number(raw) / 10 ** decimals;
}

/** Net USDC received (+) or sent (-) per wallet owner in a confirmed transaction. */
export function usdcBalanceChangesByOwner(
  meta: NonNullable<ParsedTransactionWithMeta['meta']>,
  usdcMint: string,
): Map<string, number> {
  const changes = new Map<string, number>();
  const preByIndex = new Map<number, TokenBalanceRow>();

  for (const row of meta.preTokenBalances ?? []) {
    if (row.mint === usdcMint && row.owner) {
      preByIndex.set(row.accountIndex, row);
    }
  }

  const postIndexes = new Set<number>();

  for (const post of meta.postTokenBalances ?? []) {
    if (post.mint !== usdcMint || !post.owner) continue;
    postIndexes.add(post.accountIndex);
    const pre = preByIndex.get(post.accountIndex);
    const preAmt = pre ? tokenUiAmount(pre) : 0;
    const postAmt = tokenUiAmount(post);
    const delta = postAmt - preAmt;
    const owner = parseWalletAddress(post.owner);
    changes.set(owner, (changes.get(owner) ?? 0) + delta);
  }

  for (const [index, pre] of preByIndex) {
    if (postIndexes.has(index) || !pre.owner) continue;
    const owner = parseWalletAddress(pre.owner);
    changes.set(owner, (changes.get(owner) ?? 0) - tokenUiAmount(pre));
  }

  return changes;
}

export async function assertTxConfirmed(signature: string): Promise<void> {
  const connection = getConnection();
  const status = await connection.getSignatureStatus(signature);
  if (!status.value?.confirmationStatus) {
    throw badRequest('Transaction not yet confirmed. Try again in a few seconds.');
  }
}

async function loadParsedTransaction(
  signature: string,
): Promise<ParsedTransactionWithMeta> {
  const connection = getConnection();
  const parsed = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  });

  if (!parsed?.meta) {
    throw badRequest('Transaction not found or could not be parsed');
  }
  if (parsed.meta.err) {
    throw badRequest('Transaction failed on-chain');
  }

  return parsed;
}

function assertPayerSigned(parsed: ParsedTransactionWithMeta, payerWallet: string): void {
  const payer = parseWalletAddress(payerWallet);
  const signers = parsed.transaction.message.accountKeys
    .filter((key) => key.signer)
    .map((key) => parseWalletAddress(key.pubkey.toBase58()));

  if (!signers.includes(payer)) {
    throw badRequest('Transaction was not signed by the expected payer wallet');
  }
}

function assertAmount(actual: number, expected: number, label: string): void {
  if (Math.abs(actual - expected) > AMOUNT_EPSILON) {
    throw badRequest(`${label} does not match expected amount`);
  }
}

export async function verifySettlementTransaction(
  signature: string,
  payerWallet: string,
  debts: Array<{ to_wallet: string; amount_usdc: number }>,
): Promise<void> {
  await assertTxConfirmed(signature);
  const parsed = await loadParsedTransaction(signature);
  assertPayerSigned(parsed, payerWallet);

  const changes = usdcBalanceChangesByOwner(parsed.meta!, env.usdcMintAddress);
  const payer = parseWalletAddress(payerWallet);
  const platformWallet = parseWalletAddress(env.platformWalletAddress);

  const debtTotal = debts.reduce((sum, d) => sum + d.amount_usdc, 0);
  const expectedTotal =
    Math.round((debtTotal + PLATFORM_FEE_USDC) * 1_000_000) / 1_000_000;

  const payerDelta = changes.get(payer) ?? 0;
  assertAmount(-payerDelta, expectedTotal, 'Settlement total paid');

  assertAmount(changes.get(platformWallet) ?? 0, PLATFORM_FEE_USDC, 'Platform fee');

  for (const debt of debts) {
    const recipient = parseWalletAddress(debt.to_wallet);
    assertAmount(
      changes.get(recipient) ?? 0,
      debt.amount_usdc,
      `Payment to ${recipient.slice(0, 8)}…`,
    );
  }
}

export async function verifyPeerTransferTransaction(
  signature: string,
  fromWallet: string,
  toWallet: string,
  amountUsdc: number,
): Promise<void> {
  await assertTxConfirmed(signature);
  const parsed = await loadParsedTransaction(signature);
  assertPayerSigned(parsed, fromWallet);

  const changes = usdcBalanceChangesByOwner(parsed.meta!, env.usdcMintAddress);
  const from = parseWalletAddress(fromWallet);
  const to = parseWalletAddress(toWallet);

  assertAmount(-(changes.get(from) ?? 0), amountUsdc, 'Transfer amount sent');
  assertAmount(changes.get(to) ?? 0, amountUsdc, 'Transfer amount received');
}
