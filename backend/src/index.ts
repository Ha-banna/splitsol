import { createApp } from './app';
import {
  assertProductionConfig,
  env,
  isAdminEnabled,
  isSolanaConfigured,
  isSupabaseConfigured,
} from './config/env';
import { decodeSupabaseKeyRole } from './lib/supabase';

assertProductionConfig();

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`SplitSOL API running on http://localhost:${env.port}`);
  console.log(`  Health:  http://localhost:${env.port}/health`);
  console.log(`  API v1:  http://localhost:${env.port}/v1`);
  if (isAdminEnabled()) {
    console.log(`  Admin:   http://localhost:${env.port}/admin`);
  }
  if (!isSupabaseConfigured()) {
    console.warn('  WARNING: Supabase not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  } else {
    const role = decodeSupabaseKeyRole(env.supabaseServiceRoleKey);
    if (role === 'service_role') {
      console.log('  Supabase: service_role key detected (RLS bypass OK)');
    } else {
      console.warn(
        `  WARNING: Supabase key role is "${role ?? 'unknown'}" — must be service_role or auth will fail (RLS 42501).`,
      );
      console.warn('  Dashboard → Project Settings → API → copy the service_role secret into SUPABASE_SERVICE_ROLE_KEY');
    }
  }
  if (isSolanaConfigured()) {
    const rpcHost = (() => {
      try {
        return new URL(env.heliusRpcUrl).host;
      } catch {
        return '(invalid URL)';
      }
    })();
    console.log(`  Solana:  RPC configured (${rpcHost})`);
  } else if (!env.isProduction) {
    console.log('  Solana:  dev mock mode (set HELIUS_API_KEY + PLATFORM_WALLET_ADDRESS for on-chain)');
  }
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Port ${env.port} is already in use. Stop the other process or set PORT in .env to a different port.`,
    );
    process.exit(1);
  }
  throw err;
});
