import { signToken } from '../../src/lib/jwt';
import { User } from '../../src/types';

export const mockUser: User = {
  id: '11111111-1111-1111-1111-111111111111',
  wallet_address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuGuiosqY',
  display_name: 'Test User',
  username: 'testuser',
  avatar_url: null,
  email: null,
  privy_id: null,
  sol_domain: null,
  push_token: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const mockGroup = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Test Group',
  description: null,
  icon_url: null,
  created_by: mockUser.id,
  invite_code: 'abc123',
  currency: 'USD',
  is_archived: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export function authHeader(user = mockUser): string {
  const token = signToken({ sub: user.id, wallet: user.wallet_address });
  return `Bearer ${token}`;
}
