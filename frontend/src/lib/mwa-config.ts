import type { Chain } from '@solana-mobile/mobile-wallet-adapter-protocol';
import Constants from 'expo-constants';

/** Solana Mobile / Seeker — Mobile Wallet Adapter app identity */
export const MWA_APP_IDENTITY = {
  name: 'SplitSOL',
  uri: 'https://splitsol.app',
  icon: 'favicon.png',
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
