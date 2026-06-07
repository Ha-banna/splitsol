export type SplitType = 'equal' | 'exact' | 'percentage' | 'single';

export interface User {
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

export interface Group {
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
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  user?: User;
}

export interface Expense {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  amount_usdc: number;
  paid_by: string;
  split_type: SplitType;
  date: string;
  note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  splits?: ExpenseSplit[];
  payer?: User;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
  percentage: number | null;
  user?: User;
}

export interface GroupBalance {
  group_id: string;
  group_name: string;
  user_id: string;
  display_name: string;
  wallet_address: string;
  net_balance_usdc: number;
}

export interface SimplifiedDebt {
  from_user_id: string;
  to_user_id: string;
  from_wallet: string;
  to_wallet: string;
  amount_usdc: number;
}

export interface Settlement {
  id: string;
  group_id: string;
  paid_by: string;
  total_amount_usdc: number;
  platform_fee_usdc: number;
  tx_signature: string;
  tx_confirmed_at: string | null;
  created_at: string;
}

export interface JwtPayload {
  sub: string;
  wallet: string;
}

export interface ActivityEvent {
  id: string;
  type: 'expense_added' | 'settlement_completed' | 'member_joined';
  group_id: string;
  group_name: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_avatar_url: string | null;
  description: string;
  amount_usdc: number | null;
  created_at: string;
}
