-- SplitSOL Database Schema (run in Supabase SQL editor)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users (wallet + Privy auth only; no credential columns in DB)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  username TEXT,
  avatar_url TEXT,
  email TEXT UNIQUE,
  privy_id TEXT UNIQUE,
  sol_domain TEXT,
  push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Groups
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  created_by UUID REFERENCES users(id),
  invite_code TEXT UNIQUE,
  currency TEXT DEFAULT 'USD',
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friend requests (accept to become mutual friends)
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id),
  CHECK (from_user_id <> to_user_id)
);

-- Mutual friends (both rows exist after request accepted)
CREATE TABLE IF NOT EXISTS user_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, contact_user_id),
  CHECK (owner_id <> contact_user_id)
);

-- Direct USDC sends between users (outside groups)
CREATE TABLE IF NOT EXISTS peer_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES users(id),
  to_user_id UUID NOT NULL REFERENCES users(id),
  amount_usdc DECIMAL(12, 6) NOT NULL,
  note TEXT,
  tx_signature TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group members
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  amount_usdc DECIMAL(12, 6) NOT NULL,
  paid_by UUID REFERENCES users(id),
  split_type TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Expense splits
CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  amount_owed DECIMAL(12, 6) NOT NULL,
  percentage DECIMAL(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settlements
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id),
  paid_by UUID REFERENCES users(id),
  total_amount_usdc DECIMAL(12, 6) NOT NULL,
  platform_fee_usdc DECIMAL(12, 6) DEFAULT 0.25,
  tx_signature TEXT UNIQUE NOT NULL,
  tx_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settlement transfers
CREATE TABLE IF NOT EXISTS settlement_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID REFERENCES settlements(id) ON DELETE CASCADE,
  from_user UUID REFERENCES users(id),
  to_user UUID REFERENCES users(id),
  amount_usdc DECIMAL(12, 6) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User feedback (bugs, suggestions)
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('bug', 'suggestion', 'other')),
  message TEXT NOT NULL CHECK (char_length(trim(message)) >= 10),
  platform TEXT,
  app_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Net balance per user per group
CREATE OR REPLACE VIEW group_balances AS
SELECT
  g.id AS group_id,
  g.name AS group_name,
  u.id AS user_id,
  u.display_name,
  u.wallet_address,
  COALESCE(
    (SELECT SUM(es.amount_owed)
     FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     WHERE e.group_id = g.id
       AND e.paid_by = u.id
       AND es.user_id != u.id
       AND e.deleted_at IS NULL), 0)
  -
  COALESCE(
    (SELECT SUM(es.amount_owed)
     FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     WHERE e.group_id = g.id
       AND es.user_id = u.id
       AND e.paid_by != u.id
       AND e.deleted_at IS NULL), 0)
  +
  COALESCE(
    (SELECT SUM(st.amount_usdc)
     FROM settlement_transfers st
     JOIN settlements s ON s.id = st.settlement_id
     WHERE s.group_id = g.id
       AND st.from_user = u.id), 0)
  -
  COALESCE(
    (SELECT SUM(st.amount_usdc)
     FROM settlement_transfers st
     JOIN settlements s ON s.id = st.settlement_id
     WHERE s.group_id = g.id
       AND st.to_user = u.id), 0)
  AS net_balance_usdc
FROM groups g
JOIN group_members gm ON gm.group_id = g.id
JOIN users u ON u.id = gm.user_id
WHERE g.is_archived = FALSE;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_settlements_group ON settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created ON user_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user ON user_feedback(user_id);
