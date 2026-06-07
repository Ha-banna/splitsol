import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function trimEnv(name: string, fallback = ''): string {
  return (process.env[name] ?? fallback).trim();
}

/**
 * Resolves Helius RPC URL from env.
 * HELIUS_API_KEY always wins when set (avoids stale keys baked into HELIUS_RPC_URL).
 */
export function resolveHeliusRpcUrl(): string {
  const apiKey = trimEnv('HELIUS_API_KEY');
  const explicitUrl = trimEnv('HELIUS_RPC_URL');

  if (apiKey) {
    if (explicitUrl.includes('${HELIUS_API_KEY}')) {
      return explicitUrl.replace(/\$\{HELIUS_API_KEY\}/g, encodeURIComponent(apiKey));
    }
    return `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(apiKey)}`;
  }

  if (explicitUrl.includes('${HELIUS_API_KEY}')) {
    return '';
  }

  return explicitUrl;
}

export const env = {
  nodeEnv: trimEnv('NODE_ENV', 'development'),
  port: Number(trimEnv('PORT', '3000')),
  jwtSecret: trimEnv('JWT_SECRET', 'dev-secret-change-in-production'),
  jwtExpiresIn: trimEnv('JWT_EXPIRES_IN', '7d'),

  supabaseUrl: trimEnv('SUPABASE_URL'),
  supabaseServiceRoleKey: trimEnv('SUPABASE_SERVICE_ROLE_KEY'),

  heliusRpcUrl: resolveHeliusRpcUrl(),
  platformWalletAddress: trimEnv('PLATFORM_WALLET_ADDRESS'),
  usdcMintAddress: trimEnv(
    'USDC_MINT_ADDRESS',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  ),

  privyAppId: trimEnv('PRIVY_APP_ID'),
  privyAppSecret: trimEnv('PRIVY_APP_SECRET'),

  /** Optional Expo access token for higher push rate limits */
  expoAccessToken: trimEnv('EXPO_ACCESS_TOKEN'),

  isProduction: trimEnv('NODE_ENV', 'development') === 'production',

  /** Enable admin dashboard at /admin in production (requires ADMIN_API_KEY) */
  adminEnabled: trimEnv('ADMIN_ENABLED', '') === 'true',

  /** Required in production when admin is enabled — send as X-Admin-Key header */
  adminApiKey: trimEnv('ADMIN_API_KEY'),

  /** Comma-separated allowed CORS origins; empty uses environment defaults */
  corsOrigins: trimEnv('CORS_ORIGINS')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

/** Admin UI + stats API — on in development; production requires ADMIN_ENABLED + ADMIN_API_KEY */
export function isAdminEnabled(): boolean {
  if (env.isProduction) {
    return env.adminEnabled && Boolean(env.adminApiKey);
  }
  return true;
}

export function assertSupabaseConfigured(): void {
  requireEnv('SUPABASE_URL');
  requireEnv('SUPABASE_SERVICE_ROLE_KEY');
}

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

export function isSolanaConfigured(): boolean {
  return Boolean(env.heliusRpcUrl && env.platformWalletAddress);
}

const DEV_JWT_SECRET = 'dev-secret-change-in-production';

/** Fail fast when production is misconfigured. */
export function assertProductionConfig(): void {
  if (!env.isProduction) return;

  if (!env.jwtSecret || env.jwtSecret === DEV_JWT_SECRET) {
    throw new Error('JWT_SECRET must be set to a strong random value in production');
  }
  if (!isSupabaseConfigured()) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in production');
  }
  if (!isSolanaConfigured()) {
    throw new Error('HELIUS_API_KEY and PLATFORM_WALLET_ADDRESS are required in production');
  }
  if (env.adminEnabled && !env.adminApiKey) {
    throw new Error('ADMIN_API_KEY is required when ADMIN_ENABLED=true in production');
  }
}
