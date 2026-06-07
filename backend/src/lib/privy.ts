import { env } from '../config/env';
import { badRequest } from '../utils/errors';

export interface PrivyVerifiedUser {
  privyId: string;
  email?: string;
  walletAddress?: string;
}

export async function verifyPrivyToken(privyToken: string): Promise<PrivyVerifiedUser> {
  if (!env.privyAppId || !env.privyAppSecret) {
    throw badRequest('Privy is not configured on the server');
  }

  const response = await fetch('https://auth.privy.io/api/v1/users/me', {
    headers: {
      Authorization: `Bearer ${privyToken}`,
      'privy-app-id': env.privyAppId,
    },
  });

  if (!response.ok) {
    throw badRequest('Invalid Privy token');
  }

  const data = (await response.json()) as {
    id: string;
    email?: { address?: string };
    wallet?: { address?: string };
    linked_accounts?: Array<{ type: string; address?: string }>;
  };

  let walletAddress = data.wallet?.address;
  if (!walletAddress && data.linked_accounts) {
    const solWallet = data.linked_accounts.find(
      (a) => a.type === 'wallet' && a.address,
    );
    walletAddress = solWallet?.address;
  }

  if (!walletAddress) {
    throw badRequest('Privy user has no linked Solana wallet');
  }

  return {
    privyId: data.id,
    email: data.email?.address,
    walletAddress,
  };
}
