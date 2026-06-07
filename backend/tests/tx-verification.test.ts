import { describe, expect, it } from 'vitest';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { usdcBalanceChangesByOwner } from '../src/lib/tx-verification';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

describe('usdcBalanceChangesByOwner', () => {
  it('computes net USDC flows per wallet owner', () => {
    const payer = bs58.encode(nacl.sign.keyPair().publicKey);
    const recipient = bs58.encode(nacl.sign.keyPair().publicKey);

    const meta = {
      err: null,
      preTokenBalances: [
        {
          accountIndex: 1,
          mint: USDC_MINT,
          owner: payer,
          uiTokenAmount: { amount: '5000000', decimals: 6, uiAmount: 5 },
        },
        {
          accountIndex: 2,
          mint: USDC_MINT,
          owner: recipient,
          uiTokenAmount: { amount: '0', decimals: 6, uiAmount: 0 },
        },
      ],
      postTokenBalances: [
        {
          accountIndex: 1,
          mint: USDC_MINT,
          owner: payer,
          uiTokenAmount: { amount: '2000000', decimals: 6, uiAmount: 2 },
        },
        {
          accountIndex: 2,
          mint: USDC_MINT,
          owner: recipient,
          uiTokenAmount: { amount: '3000000', decimals: 6, uiAmount: 3 },
        },
      ],
    };

    const changes = usdcBalanceChangesByOwner(meta, USDC_MINT);
    expect(changes.get(payer)).toBe(-3);
    expect(changes.get(recipient)).toBe(3);
  });

  it('ignores non-USDC token balances', () => {
    const payer = bs58.encode(nacl.sign.keyPair().publicKey);

    const meta = {
      err: null,
      preTokenBalances: [
        {
          accountIndex: 1,
          mint: 'OtherMint111111111111111111111111111111111',
          owner: payer,
          uiTokenAmount: { amount: '100', decimals: 6, uiAmount: 0.0001 },
        },
      ],
      postTokenBalances: [
        {
          accountIndex: 1,
          mint: 'OtherMint111111111111111111111111111111111',
          owner: payer,
          uiTokenAmount: { amount: '0', decimals: 6, uiAmount: 0 },
        },
      ],
    };

    const changes = usdcBalanceChangesByOwner(meta, USDC_MINT);
    expect(changes.size).toBe(0);
  });
});
