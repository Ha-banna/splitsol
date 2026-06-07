export interface SolanaWalletProvider {
  name: string;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<void>;
  getAddress(): string;
  signMessage(message: string): Promise<string>;
}

interface LegacyWalletInjected {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  publicKey?: { toBase58(): string; toString(): string };
  connect?(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toBase58(): string } }>;
  signMessage?(
    message: Uint8Array,
    display?: 'utf8' | 'hex',
  ): Promise<{ signature: Uint8Array }>;
  signTransaction?(transaction: import('@solana/web3.js').Transaction): Promise<import('@solana/web3.js').Transaction>;
  signAndSendTransaction?(
    transaction: import('@solana/web3.js').Transaction,
  ): Promise<{ signature: string }>;
}

declare global {
  interface Window {
    phantom?: { solana?: LegacyWalletInjected };
    solflare?: LegacyWalletInjected;
    backpack?: LegacyWalletInjected;
    solana?: LegacyWalletInjected;
  }
}

export {};
