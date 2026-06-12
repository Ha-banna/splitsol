import type { Chain } from '@solana-mobile/mobile-wallet-adapter-protocol';
import Constants from 'expo-constants';

/**
 * Base URL for MWA app identity (no trailing slash).
 * Wallet resolves `icon` relative to this URI, e.g. …/app-icon.png
 */
function resolveMwaIdentityUri(): string {
  const fromExtra = Constants.expoConfig?.extra?.mwaIdentityUri as string | undefined;
  if (fromExtra?.trim()) return fromExtra.trim().replace(/\/$/, '');

  const fromEnv = process.env.EXPO_PUBLIC_MWA_IDENTITY_URI?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const apiUrl =
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    process.env.EXPO_PUBLIC_API_URL ??
    '';
  const fromApi = apiUrl.replace(/\/v1\/?$/, '');
  if (fromApi.startsWith('http')) return fromApi;

  return 'https://splitsol-production1.up.railway.app';
}

/**
 * Solana Mobile / Seeker — Mobile Wallet Adapter app identity.
 * `uri` must be absolute; `icon` must be relative to `uri` (not a full URL or data URI).
 * Resolves to https://splitsol-production1.up.railway.app/app-icon.png
 */
export const MWA_APP_IDENTITY = {
  name: 'SplitSOL',
  uri: resolveMwaIdentityUri(),
  icon: 'app-icon.png',
};

const cluster =
  Constants.expoConfig?.extra?.solanaCluster ??
  process.env.EXPO_PUBLIC_SOLANA_CLUSTER ??
  'mainnet-beta';

/**
 * MWA 2.0 chain id. Mainnet must be `solana:mainnet` (not `solana:mainnet-beta`).
 * An invalid chain breaks silent re-authorization and forces a full connect each time.
 */
export const MWA_CHAIN: Chain =
  cluster === 'mainnet-beta' || cluster === 'mainnet'
    ? ('solana:mainnet' as Chain)
    : cluster === 'devnet' || cluster === 'testnet'
      ? (`solana:${cluster}` as Chain)
      : (`solana:${cluster}` as Chain);
