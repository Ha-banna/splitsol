import { afterEach, describe, expect, it, vi } from 'vitest';

describe('resolveHeliusRpcUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('builds URL from HELIUS_API_KEY when set', async () => {
    vi.stubEnv('HELIUS_API_KEY', 'test-key-123');
    vi.stubEnv('HELIUS_RPC_URL', '');
    const { resolveHeliusRpcUrl } = await import('../src/config/env');
    expect(resolveHeliusRpcUrl()).toBe('https://mainnet.helius-rpc.com/?api-key=test-key-123');
  });

  it('prefers HELIUS_API_KEY over a stale key embedded in HELIUS_RPC_URL', async () => {
    vi.stubEnv('HELIUS_API_KEY', 'new-key');
    vi.stubEnv('HELIUS_RPC_URL', 'https://mainnet.helius-rpc.com/?api-key=old-key');
    const { resolveHeliusRpcUrl } = await import('../src/config/env');
    expect(resolveHeliusRpcUrl()).toBe('https://mainnet.helius-rpc.com/?api-key=new-key');
  });

  it('expands ${HELIUS_API_KEY} placeholder in HELIUS_RPC_URL', async () => {
    vi.stubEnv('HELIUS_API_KEY', 'my-key');
    vi.stubEnv(
      'HELIUS_RPC_URL',
      'https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}',
    );
    const { resolveHeliusRpcUrl } = await import('../src/config/env');
    expect(resolveHeliusRpcUrl()).toBe('https://mainnet.helius-rpc.com/?api-key=my-key');
  });

  it('uses explicit HELIUS_RPC_URL when HELIUS_API_KEY is unset', async () => {
    vi.stubEnv('HELIUS_API_KEY', '');
    vi.stubEnv('HELIUS_RPC_URL', 'https://custom-rpc.example.com');
    const { resolveHeliusRpcUrl } = await import('../src/config/env');
    expect(resolveHeliusRpcUrl()).toBe('https://custom-rpc.example.com');
  });

  it('trims whitespace from HELIUS_API_KEY', async () => {
    vi.stubEnv('HELIUS_API_KEY', '  trimmed-key  ');
    vi.stubEnv('HELIUS_RPC_URL', '');
    const { resolveHeliusRpcUrl } = await import('../src/config/env');
    expect(resolveHeliusRpcUrl()).toBe('https://mainnet.helius-rpc.com/?api-key=trimmed-key');
  });
});

describe('isSolanaRpcFailure', () => {
  it('detects SOLANA_RPC_ERROR AppError for dev mock fallback', async () => {
    const { isSolanaRpcFailure } = await import('../src/services/solana.service');
    const { solanaRpcError } = await import('../src/utils/errors');
    expect(isSolanaRpcFailure(solanaRpcError())).toBe(true);
    expect(isSolanaRpcFailure(new Error('401 Unauthorized: invalid api key'))).toBe(true);
    expect(isSolanaRpcFailure(new Error('Insufficient funds'))).toBe(false);
  });
});
