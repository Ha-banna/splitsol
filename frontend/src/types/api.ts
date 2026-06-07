export interface ApiUser {
  id: string;
  wallet_address: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  email: string | null;
  privy_id: string | null;
  sol_domain: string | null;
  push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiGroup {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  created_by: string | null;
  invite_code: string | null;
  currency: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  my_balance_usdc?: number;
}

export interface ApiGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user?: ApiUser;
}

export interface ApiExpense {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  amount_usdc: number;
  paid_by: string;
  split_type: string;
  date: string;
  note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  payer?: ApiUser;
}

export interface ApiBalanceMember {
  user_id: string;
  display_name: string;
  wallet_address: string;
  avatar_url?: string | null;
  username?: string | null;
  net_balance_usdc: number;
}

export interface ApiActivityEvent {
  id: string;
  type: 'expense_added' | 'settlement_completed' | 'member_joined';
  group_id: string;
  group_name: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_avatar_url?: string | null;
  description: string;
  amount_usdc: number | null;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: ApiUser;
}

export interface GroupDetailResponse {
  group: ApiGroup;
  members: ApiGroupMember[];
  balances: Array<{
    group_id: string;
    group_name: string;
    user_id: string;
    display_name: string;
    wallet_address: string;
    net_balance_usdc: number;
  }>;
}

export interface BalancesResponse {
  members: ApiBalanceMember[];
  simplified_debts: Array<{
    from_user_id: string;
    to_user_id: string;
    amount_usdc: number;
  }>;
}

export interface PublicUserProfile {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  wallet_address: string;
}

export interface ApiContact {
  id: string;
  contact_user_id: string;
  created_at: string;
  user: PublicUserProfile;
}

export interface ApiFriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  user: PublicUserProfile;
}

export interface PrepareTransferResponse {
  to_user: PublicUserProfile;
  amount_usdc: number;
  note: string | null;
  total_usdc: number;
  serialized_transaction: string;
  dev_mode?: boolean;
}

export interface PrepareSettlementResponse {
  debts: Array<{ to_wallet: string; amount_usdc: number }>;
  platform_fee_usdc: number;
  total_usdc: number;
  serialized_transaction: string;
  dev_mode?: boolean;
}
