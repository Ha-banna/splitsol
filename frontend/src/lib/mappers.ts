import type { ApiUser } from '@/types/api';

export interface UiUser {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  walletAddress: string;
}

export function toUiUser(user: ApiUser): UiUser {
  return {
    id: user.id,
    name: user.display_name,
    username: user.username,
    avatarUrl: user.avatar_url,
    walletAddress: user.wallet_address,
  };
}

export function shortenWallet(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
