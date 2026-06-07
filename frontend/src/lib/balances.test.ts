import { describe, expect, it } from 'vitest';
import { formatSignedUsdcAmount, sumGroupBalances } from './balances';

describe('sumGroupBalances', () => {
  it('sums numeric balances', () => {
    const result = sumGroupBalances([
      { id: '1', my_balance_usdc: 10 } as never,
      { id: '2', my_balance_usdc: -4.5 } as never,
    ]);
    expect(result.totalOwedToMe).toBe(10);
    expect(result.totalIOwe).toBe(4.5);
  });

  it('coerces string balances from API', () => {
    const result = sumGroupBalances([
      { id: '1', my_balance_usdc: '12.25' } as never,
      { id: '2', my_balance_usdc: '-3' } as never,
    ]);
    expect(result.totalOwedToMe).toBe(12.25);
    expect(result.totalIOwe).toBe(3);
  });
});

describe('formatSignedUsdcAmount', () => {
  it('prefixes negative balances with a minus sign', () => {
    expect(formatSignedUsdcAmount(-4.5)).toBe('-$4.50');
    expect(formatSignedUsdcAmount('-3' as unknown as number)).toBe('-$3.00');
  });

  it('prefixes positive balances with a plus sign', () => {
    expect(formatSignedUsdcAmount(10)).toBe('+$10.00');
  });

  it('formats zero without a sign', () => {
    expect(formatSignedUsdcAmount(0)).toBe('$0.00');
  });
});
