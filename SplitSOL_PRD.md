# SplitSOL — Product Requirements Document (PRD)
**Version:** 1.0  
**Date:** May 2026  
**Status:** Ready for Development  
**Target Platform:** Solana dApp Store (Android / Seeker) + Progressive Web App  

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Problem Statement](#2-problem-statement)
3. [Solution](#3-solution)
4. [Target Users](#4-target-users)
5. [Core Features — MVP](#5-core-features--mvp)
6. [User Flows](#6-user-flows)
7. [Screen-by-Screen Specification](#7-screen-by-screen-specification)
8. [Technical Architecture](#8-technical-architecture)
9. [Smart Contract Specification](#9-smart-contract-specification)
10. [Data Models](#10-data-models)
11. [API Specification](#11-api-specification)
12. [Tech Stack](#12-tech-stack)
13. [Revenue Model](#13-revenue-model)
14. [Security Requirements](#14-security-requirements)
15. [Non-Functional Requirements](#15-non-functional-requirements)
16. [Out of Scope (v1)](#16-out-of-scope-v1)
17. [Milestones & Timeline](#17-milestones--timeline)
18. [Open Questions](#18-open-questions)

---

## 1. Product Overview

**SplitSOL** is a mobile-first expense splitting app built on Solana. Groups of people log shared expenses, the app calculates who owes what, and settlement happens in a single USDC transaction directly wallet-to-wallet — no bank account, no payment processor, no waiting days for transfers.

Think Splitwise, but every settlement is instant, global, and costs less than $0.001 in gas fees.

### Elevator Pitch

> "Split dinner with anyone in the world. One tap. Settled in USDC. No bank needed."

### Why Crypto Makes This Better Than Splitwise

| Feature | Splitwise | SplitSOL |
|---|---|---|
| Settlement method | Venmo / PayPal / bank transfer | Direct USDC wallet transfer |
| Settlement speed | Hours to days | ~400ms |
| Cross-border fees | 3–7% currency conversion | Zero |
| Requires bank account | Yes | No |
| Available in 190+ countries | Partial | Full |
| Platform fee | Free (or $3.99/mo premium) | $0.25 flat per settlement |

---

## 2. Problem Statement

### The Core Pain

When people share expenses — dinners, trips, rent, subscriptions — settling up is painful:

- PayPal charges fees and takes 1–3 days internationally
- Venmo is US-only
- Bank transfers are slow, expensive cross-border, and require sharing account details
- Splitwise solves the tracking but not the payment — it just tells you who owes what and then you have to go use another app to actually pay

### Who Feels This Most

- International friend groups traveling together
- Remote teams splitting shared tool costs
- Housemates in different countries
- Digital nomads splitting coworking or accommodation costs
- Crypto users who already hold USDC and want to settle in it

### The Numbers

- Splitwise has 50 million users
- They settled over $1 billion in IOUs in a single year
- Average friend group settles debts 2–4 times per month
- Cross-border transfers cost the average person $150–$300 per year in fees

---

## 3. Solution

SplitSOL solves both halves of the problem:

1. **Tracking** — Log expenses, split them however you want (equally, by percentage, by exact amounts, or one person pays)
2. **Settlement** — A single "Settle Up" button executes a batch USDC transfer on Solana that pays all debts in one transaction, signed by the user's wallet (Phantom or Seed Vault on Seeker)

### What Makes It Technically Possible

Solana's native `createTransferInstruction` supports multiple recipients in a single transaction. A group with 4 people settling up can execute all transfers atomically in one transaction costing ~$0.00025 total in gas. There is **no custom smart contract** — this uses Solana's standard SPL token transfer program which has been audited by Solana Labs. Zero audit cost for the developer.

---

## 4. Target Users

### Primary User: The International Traveler

- Age 22–35
- Travels internationally 3–6 times per year with friend groups
- Currently loses money on PayPal/Revolut fees
- May or may not already have a crypto wallet
- Has a smartphone (Android or iOS)

### Secondary User: The Remote Team

- Freelancers or small team members sharing software subscriptions, coworking costs
- Already comfortable with crypto or USDC
- Needs a clean record of shared expenses for accounting

### Tertiary User: The Seeker Owner

- Crypto-native, has a Solana Seeker phone
- Already uses Phantom wallet
- Wants to use Seed Vault (biometric signing) for everything
- Actively looking for useful Seeker-native apps

### User Persona — Primary

**Name:** Marco, 27  
**Location:** Lives in Berlin, friends in London, Lisbon, NYC  
**Pain:** After every trip, collecting money from friends via PayPal costs 3–5% in fees and takes days. Some friends don't have Venmo. Bank transfers require IBAN numbers and 3-day waits.  
**Goal:** Split the Airbnb and flights with 5 people and get paid back instantly, in full, without fees.  
**Crypto experience:** Owns some ETH and USDC on Coinbase. Never used a dApp before.

---

## 5. Core Features — MVP

### 5.1 Groups

- Create a named group (e.g., "Portugal Trip 2026", "Apartment 4B")
- Invite members by wallet address, ENS name, or Solana domain (.sol)
- View all groups in a list on the home screen
- Leave or archive a group

### 5.2 Expense Logging

- Add an expense with: description, total amount (in USD display, settled in USDC), date, who paid
- Split options:
  - **Equal split** — divide by number of members
  - **Exact amounts** — manually enter what each person owes
  - **Percentages** — assign % of total to each person
  - **One person owes all** — one member owes the payer the full amount
- Attach an optional note or emoji to the expense
- Edit or delete an expense (only the creator can delete)

### 5.3 Balance Dashboard

- Per-group view showing each member's net balance (green = owed money, red = owes money)
- Simplified debt algorithm — consolidates multiple debts into the minimum number of transfers needed
- Total "you are owed" and "you owe" summary on home screen

### 5.4 Settle Up

- "Settle Up" button on any group where you owe money
- Shows a summary: "You owe Marco 12.50 USDC and Sofia 8.00 USDC — settle both in 1 transaction"
- User connects wallet (Phantom or Seed Vault)
- Confirms the transaction amounts
- One tap — Solana batch transfer executes all debts at once
- Transaction signature stored and shown as proof of settlement
- Balances update in real time after confirmation

### 5.5 Activity Feed

- Per-group activity log: expenses added, members joined, settlements completed
- Push notification when someone adds an expense to your group
- Push notification when someone settles a debt with you

### 5.6 Wallet Connection

- Connect Phantom wallet (browser extension or mobile app)
- Connect Seed Vault on Solana Seeker (via Mobile Wallet Adapter)
- Display connected wallet address in profile
- No wallet needed to browse groups or add expenses — only required for settling up

---

## 6. User Flows

### Flow 1: New User Onboarding

```
App opens
  → Splash screen (logo + tagline)
  → "Get Started" button
  → Choose sign-in method:
      A. Connect Wallet (Phantom / Seed Vault)
      B. Sign in with email (creates embedded wallet via Privy — see tech stack)
  → Enter display name + optional profile photo
  → Home screen (empty state with "Create your first group" CTA)
```

### Flow 2: Create Group and Add Expense

```
Home screen
  → Tap "New Group"
  → Enter group name
  → Add members (search by .sol domain, paste wallet address, or share invite link)
  → Group created → Group detail screen
  → Tap "Add Expense"
  → Enter: description, amount, who paid (defaults to you)
  → Choose split type (equal by default)
  → Tap "Save"
  → Expense appears in group feed
  → All members receive push notification
```

### Flow 3: Settle Up

```
Group detail screen (showing you owe money)
  → Tap "Settle Up"
  → Settlement summary screen:
      "You owe:
        Marco — 12.50 USDC
        Sofia  —  8.00 USDC
       Total: 20.50 USDC
       Platform fee: $0.25
       Total charged: 20.75 USDC"
  → Tap "Confirm & Pay"
  → Wallet signing prompt (Phantom popup or Seed Vault biometric)
  → User approves
  → Transaction submitted to Solana
  → Loading state ("Settling up...")
  → Success screen (transaction confirmed, signature shown)
  → Balances update to $0.00
  → All group members notified
```

### Flow 4: Invite Non-Crypto User

```
Group detail screen
  → Tap "Add Member"
  → Tap "Invite by Link"
  → Share link via WhatsApp / iMessage / email
  → Recipient opens link on their phone
  → Sees a web view of the group expenses (read-only, no wallet needed)
  → "Join Group" CTA prompts them to sign in with email
  → Privy creates an embedded wallet automatically in the background
  → They appear in the group as a member
  → They can log expenses immediately
  → When it's time to settle, they're prompted to fund their embedded wallet
```

---

## 7. Screen-by-Screen Specification

### Screen 1: Splash / Onboarding

- Full-screen gradient background (dark blue → purple, matching Solana brand)
- SplitSOL logo centered
- Tagline: "Split anything. Settle instantly."
- Two buttons: "Connect Wallet" | "Sign in with Email"
- Small text: "No bank account needed. Powered by Solana."

### Screen 2: Home Screen

- Header: "SplitSOL" + profile avatar (top right)
- Summary card at top:
  - "You are owed: $X.XX" (green)
  - "You owe: $X.XX" (red)
- Section: "Your Groups" — list of group cards
  - Group card: group name, member avatars, your net balance in this group, last activity timestamp
- FAB (Floating Action Button): "+" → Create Group
- Bottom nav: Home | Activity | Profile

### Screen 3: Group Detail Screen

- Group name + member avatar strip at top
- Your balance in this group (large, colored)
- "Settle Up" button (prominent, shown only if you owe money)
- "Add Expense" button
- Member balance list:
  - Each member: avatar, name, amount they owe or are owed within the group
- Expense history (chronological, newest first):
  - Each expense: description, amount, who paid, how it was split, date
- Tab bar: Balances | Expenses

### Screen 4: Add Expense Screen

- Back button + title "Add Expense"
- Fields:
  - Description (text input, required)
  - Amount (number input, USDC, required)
  - Date (date picker, defaults to today)
  - Paid by (member picker, defaults to you)
  - Split type (segmented control: Equal | Exact | Percentages | One Person)
  - Split detail (shown below based on split type selection)
- "Save Expense" button (disabled until required fields filled)

### Screen 5: Settle Up Screen

- Title: "Settle Up"
- Itemized list of debts being settled:
  - Each row: member avatar + name + amount owed
- Divider
- "Platform fee: $0.25"
- "Total: $X.XX USDC"
- Connected wallet address shown (abbreviated)
- "Confirm & Pay" button (calls wallet signing)
- Small text: "Settlement executes as a single Solana transaction"

### Screen 6: Settlement Success Screen

- Large checkmark animation
- "All settled! 🎉"
- Transaction details:
  - Total paid: $X.XX USDC
  - Transaction signature (abbreviated, tap to copy)
  - "View on Solscan" link
- "Back to Group" button

### Screen 7: Activity Feed Screen

- Chronological feed of all events across all groups:
  - [Avatar] Marco added "Dinner" — $85.00 to Portugal Trip • 2h ago
  - [Avatar] Sofia settled up with you — $23.00 • Yesterday
  - [Avatar] You were added to "Berlin Apartment" by Klaus • 3d ago
- Tap any item → navigates to relevant group

### Screen 8: Profile Screen

- Avatar (tap to edit)
- Display name (tap to edit)
- Connected wallet address (abbreviated, tap to copy full)
- "Change Wallet" option
- Settings section:
  - Default currency display (USD / EUR / GBP — for display only, all settled in USDC)
  - Push notifications toggle
  - Transaction history (list of all settlements you've made)
- "Share Profile" — generates a .sol or wallet-based payment link

---

## 8. Technical Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND                          │
│   React Native (Expo) — iOS, Android, Seeker        │
│   Mobile Wallet Adapter SDK (Seed Vault)            │
│   Phantom wallet adapter                           │
│   Privy SDK (embedded wallets for email users)      │
└──────────────────┬──────────────────────────────────┘
                   │ HTTPS REST + WebSocket
┌──────────────────▼──────────────────────────────────┐
│                   BACKEND                           │
│   Node.js + Express                                 │
│   Supabase (PostgreSQL + Auth + Realtime)           │
│   Railway hosting                                   │
└──────────────────┬──────────────────────────────────┘
                   │ RPC calls
┌──────────────────▼──────────────────────────────────┐
│                   BLOCKCHAIN                        │
│   Solana Mainnet                                    │
│   SPL Token Program (USDC transfers)                │
│   Helius RPC endpoint                               │
│   NO CUSTOM SMART CONTRACT                         │
└─────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

**Decision 1: No Custom Smart Contract**  
All settlement uses Solana's native SPL Token Program `createTransferInstruction`. This means:
- Zero audit cost
- Zero deployment cost
- Zero upgrade risk
- Transfers are atomic via `sendAndConfirmTransaction` with multiple instructions

**Decision 2: Off-Chain Expense Storage**  
Expenses, groups, and balances are stored in a Supabase PostgreSQL database — not on-chain. Reasons:
- Storing every expense on-chain would cost ~$0.002/expense and create unnecessary blockchain bloat
- Only the final settlement (USDC transfer) needs to be on-chain
- Off-chain storage can be edited/deleted freely (important for UX)
- The transaction signature from settlement is stored in the database as an immutable proof of payment

**Decision 3: Privy for Non-Crypto Users**  
Privy.io provides embedded wallets created from email addresses. This means a user who has never used crypto can join a group, log expenses, and settle up without understanding wallets, seed phrases, or gas. Privy handles key management in the background.

**Decision 4: React Native + Expo**  
- Builds to both iOS (PWA/web) and Android (APK for Solana dApp Store)
- Expo Go for development previews
- EAS Build for production APK generation
- Single codebase for all platforms

---

## 9. Smart Contract Specification

**There is no custom smart contract in SplitSOL v1.**

All on-chain operations use existing, audited Solana programs:

### Settlement Transaction Construction

When a user taps "Settle Up", the frontend constructs a Solana transaction containing multiple `createTransferInstruction` calls — one per debt being settled — all bundled into a single transaction.

```typescript
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

async function buildSettlementTransaction(
  connection: Connection,
  payerWallet: PublicKey,
  debts: Array<{ recipientWallet: string; amountUSDC: number }>
): Promise<Transaction> {
  const transaction = new Transaction();

  // Add platform fee instruction first
  const platformWallet = new PublicKey(process.env.PLATFORM_WALLET_ADDRESS!);
  const payerTokenAccount = await getAssociatedTokenAddress(USDC_MINT, payerWallet);
  const platformTokenAccount = await getAssociatedTokenAddress(USDC_MINT, platformWallet);

  // Platform fee: $0.25 USDC = 250000 lamports (USDC has 6 decimals)
  transaction.add(
    createTransferInstruction(
      payerTokenAccount,
      platformTokenAccount,
      payerWallet,
      250000,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  // Add one transfer instruction per debt
  for (const debt of debts) {
    const recipientPublicKey = new PublicKey(debt.recipientWallet);
    const recipientTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      recipientPublicKey
    );
    // USDC has 6 decimal places: $1.00 = 1,000,000 units
    const amountInMicroUSDC = Math.round(debt.amountUSDC * 1_000_000);

    transaction.add(
      createTransferInstruction(
        payerTokenAccount,
        recipientTokenAccount,
        payerWallet,
        amountInMicroUSDC,
        [],
        TOKEN_PROGRAM_ID
      )
    );
  }

  return transaction;
}
```

### Important: Associated Token Account Check

Before building the transaction, the backend must verify that each recipient has an Associated Token Account (ATA) for USDC. If they don't, a `createAssociatedTokenAccountInstruction` must be prepended to create it (costs ~0.002 SOL, charged to the payer).

```typescript
import { getAccount, TokenAccountNotFoundError } from "@solana/spl-token";

async function ensureATAExists(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey
): Promise<boolean> {
  const ata = await getAssociatedTokenAddress(mint, owner);
  try {
    await getAccount(connection, ata);
    return true; // ATA exists
  } catch (error) {
    if (error instanceof TokenAccountNotFoundError) {
      return false; // ATA needs to be created
    }
    throw error;
  }
}
```

---

## 10. Data Models

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,       -- Solana public key (base58)
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  email TEXT UNIQUE,                          -- nullable, for Privy email users
  privy_id TEXT UNIQUE,                       -- nullable, Privy user ID
  sol_domain TEXT,                            -- nullable, e.g. "marco.sol"
  push_token TEXT,                            -- Expo push notification token
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Groups Table

```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id),
  invite_code TEXT UNIQUE DEFAULT generate_invite_code(),
  currency TEXT DEFAULT 'USD',               -- display currency (all settled in USDC)
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Group Members Table

```sql
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',                -- 'admin' | 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);
```

### Expenses Table

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,            -- in display currency
  amount_usdc DECIMAL(12, 6) NOT NULL,       -- in USDC at time of entry
  paid_by UUID REFERENCES users(id),
  split_type TEXT NOT NULL,                  -- 'equal' | 'exact' | 'percentage' | 'single'
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ                     -- soft delete
);
```

### Expense Splits Table

```sql
CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  amount_owed DECIMAL(12, 6) NOT NULL,       -- USDC amount this user owes
  percentage DECIMAL(5, 2),                  -- nullable, used if split_type = 'percentage'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Settlements Table

```sql
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id),
  paid_by UUID REFERENCES users(id),         -- who initiated the settlement
  total_amount_usdc DECIMAL(12, 6) NOT NULL, -- total USDC transferred
  platform_fee_usdc DECIMAL(12, 6) DEFAULT 0.25,
  tx_signature TEXT UNIQUE NOT NULL,         -- Solana transaction signature
  tx_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Settlement Transfers Table

```sql
CREATE TABLE settlement_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID REFERENCES settlements(id),
  from_user UUID REFERENCES users(id),
  to_user UUID REFERENCES users(id),
  amount_usdc DECIMAL(12, 6) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Debt Calculation View

```sql
-- Computed view: net balance per user per group
CREATE VIEW group_balances AS
SELECT
  g.id AS group_id,
  g.name AS group_name,
  u.id AS user_id,
  u.display_name,
  u.wallet_address,
  COALESCE(
    -- What others owe them (they paid for expenses)
    (SELECT SUM(es.amount_owed)
     FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     WHERE e.group_id = g.id
       AND e.paid_by = u.id
       AND es.user_id != u.id
       AND e.deleted_at IS NULL), 0)
  -
  COALESCE(
    -- What they owe others
    (SELECT SUM(es.amount_owed)
     FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     WHERE e.group_id = g.id
       AND es.user_id = u.id
       AND e.paid_by != u.id
       AND e.deleted_at IS NULL), 0)
  AS net_balance_usdc
FROM groups g
JOIN group_members gm ON gm.group_id = g.id
JOIN users u ON u.id = gm.user_id
WHERE g.is_archived = FALSE;
```

---

## 11. API Specification

Base URL: `https://api.splitsol.app/v1`

All endpoints require a JWT token in the `Authorization: Bearer <token>` header, except `/auth/*`.

### Authentication

```
POST /auth/wallet
Body: { wallet_address, signed_message, signature }
Returns: { token, user }

POST /auth/email
Body: { privy_token }
Returns: { token, user }
```

### Users

```
GET  /users/me
     Returns: current user profile

PATCH /users/me
Body: { display_name?, avatar_url?, push_token? }
Returns: updated user

GET  /users/search?q={query}
     Search by wallet address, .sol domain, or display name
     Returns: array of users (limited to 10)
```

### Groups

```
GET  /groups
     Returns: all groups for current user with balances

POST /groups
Body: { name, description? }
Returns: created group

GET  /groups/:id
     Returns: group detail with members and balances

PATCH /groups/:id
Body: { name?, description?, is_archived? }
Returns: updated group

POST /groups/:id/members
Body: { wallet_address }
Returns: added member

DELETE /groups/:id/members/:userId
Returns: 204 No Content

GET  /groups/:id/invite-link
Returns: { invite_url }

POST /groups/join
Body: { invite_code }
Returns: group detail
```

### Expenses

```
GET  /groups/:id/expenses
     Query params: limit=20, offset=0
     Returns: paginated expense list

POST /groups/:id/expenses
Body: {
  description,
  amount,
  paid_by_user_id,
  split_type,          // 'equal' | 'exact' | 'percentage' | 'single'
  date,
  note?,
  splits: [            // required for 'exact' and 'percentage'
    { user_id, amount? , percentage? }
  ]
}
Returns: created expense with splits

PATCH /groups/:groupId/expenses/:id
Body: { description?, amount?, note? }
Returns: updated expense

DELETE /groups/:groupId/expenses/:id
Returns: 204 No Content (soft delete, only creator can delete)
```

### Balances

```
GET  /groups/:id/balances
     Returns: {
       members: [
         { user_id, display_name, wallet_address, net_balance_usdc }
       ],
       simplified_debts: [
         { from_user_id, to_user_id, amount_usdc }
       ]
     }
```

### Settlements

```
POST /groups/:id/settlements/prepare
Body: { payer_wallet_address }
Returns: {
  debts: [{ to_wallet, amount_usdc }],
  platform_fee_usdc: 0.25,
  total_usdc,
  serialized_transaction  // base64 encoded, ready to sign
}

POST /groups/:id/settlements/confirm
Body: { tx_signature }
Returns: { settlement, updated_balances }

GET  /groups/:id/settlements
Returns: settlement history for group
```

### Activity Feed

```
GET  /activity
     Query params: limit=20, offset=0
     Returns: paginated activity events across all groups
```

---

## 12. Tech Stack

### Frontend

| Layer | Technology | Reason |
|---|---|---|
| Framework | React Native (Expo SDK 52) | Single codebase for Android + web |
| Language | TypeScript | Type safety, better DX |
| Navigation | Expo Router v3 | File-based routing, deep links |
| State management | Zustand | Lightweight, no boilerplate |
| Server state | TanStack Query v5 | Caching, background refetch |
| Styling | NativeWind (Tailwind for RN) | Familiar CSS utility classes |
| Wallet connection (mobile) | Mobile Wallet Adapter SDK | Seed Vault on Seeker |
| Wallet connection (web) | @solana/wallet-adapter-react | Phantom on desktop/web |
| Embedded wallets | Privy React Native SDK | Email sign-in without crypto knowledge |
| Solana JS SDK | @solana/web3.js v2 | Solana transactions |
| SPL tokens | @solana/spl-token | USDC transfer instructions |
| Push notifications | Expo Notifications | Cross-platform push |
| Build / deploy | EAS Build | APK for dApp Store |

### Backend

| Layer | Technology | Reason |
|---|---|---|
| Runtime | Node.js 22 | Familiar, fast |
| Framework | Express 5 | Lightweight REST API |
| Language | TypeScript | Type safety |
| Database | Supabase (PostgreSQL) | Free tier, realtime, built-in auth |
| ORM | Supabase JS client | Works seamlessly with Supabase |
| Realtime | Supabase Realtime | Balance updates without polling |
| Hosting | Railway | $5/month, easy deploys from GitHub |
| Environment | dotenv | Config management |

### Blockchain

| Layer | Technology | Reason |
|---|---|---|
| Network | Solana Mainnet | Fast, cheap, Seeker-native |
| RPC provider | Helius | Best Solana RPC, free tier generous |
| Token standard | SPL Token Program | Audited by Solana Labs, handles USDC |
| USDC contract | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | Official USDC on Solana |
| Explorer | Solscan | Link to transaction proofs |

### Infrastructure

| Service | Tool | Cost |
|---|---|---|
| Frontend hosting | Vercel | Free tier |
| Backend hosting | Railway | $5/month |
| Database | Supabase | Free tier (500MB) |
| RPC | Helius | Free tier (3M requests/month) |
| Domain | Namecheap | ~$15/year |
| Embedded wallets | Privy | Free up to 1,000 users |

**Total infrastructure cost: ~$20/month at MVP scale**

---

## 13. Revenue Model

### Primary: Settlement Fee

- **$0.25 flat fee** per settlement transaction (not per expense — per "Settle Up" tap)
- Collected as a USDC transfer to the platform wallet, bundled into the same transaction as the user's debt payments
- A group of 5 friends settling up once a week = $1.00/week/group = $52/year per group

### Revenue Projections

| Active Groups | Avg Settlements/Month | Monthly Revenue |
|---|---|---|
| 100 | 3 | $75 |
| 1,000 | 3 | $750 |
| 10,000 | 3 | $7,500 |
| 100,000 | 3 | $75,000 |

### Secondary: Premium Plan ($4.99/month)

Unlocked features for premium users:
- Recurring expenses (monthly rent auto-added)
- Multi-currency display (show balances in EUR, GBP, etc.)
- Advanced analytics (spending by category, by person, over time)
- Priority support
- No platform fee on settlements (replaces the $0.25/settlement)
- CSV export of all expenses

### Future Revenue (Post-MVP)

- **API access** for other apps integrating SplitSOL balances
- **White-label** for travel apps and booking platforms
- **Business plan** for small teams and startups managing shared expenses

---

## 14. Security Requirements

### Critical: No Funds Held by Platform

SplitSOL **never holds user funds**. The platform wallet only receives the $0.25 settlement fee. All USDC debt payments go directly wallet-to-wallet. This is the most important security property of the system — it means there is nothing to hack for user funds.

### Wallet Verification

- When a user connects a wallet, the backend issues a challenge message (nonce)
- User must sign the message with their private key
- Backend verifies the signature using `@solana/web3.js` `nacl.sign.detached.verify`
- This proves wallet ownership without storing private keys

```typescript
// Challenge message format
const message = `SplitSOL Authentication\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
```

### Transaction Verification

- After a settlement transaction is submitted, the backend polls Helius until confirmation
- The transaction is parsed to verify: correct USDC mint, correct recipients, correct amounts
- Only after verification does the backend mark debts as settled in the database
- This prevents a user submitting a fake/modified transaction signature

### JWT Security

- JWTs expire after 7 days
- Refresh tokens stored in secure storage (Expo SecureStore on mobile)
- All API endpoints validate JWT before processing

### Supabase Row Level Security (RLS)

Enable RLS on all tables. Key policies:

```sql
-- Users can only read groups they are members of
CREATE POLICY "members_can_read_group" ON groups
  FOR SELECT USING (
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

-- Only group members can add expenses
CREATE POLICY "members_can_insert_expense" ON expenses
  FOR INSERT WITH CHECK (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

-- Only expense creator can delete their expense
CREATE POLICY "creator_can_delete_expense" ON expenses
  FOR UPDATE USING (created_by = auth.uid());
```

### Rate Limiting

- Settlement endpoint: 10 requests per minute per wallet (prevent spam)
- Group creation: 20 groups per day per user
- Expense creation: 100 expenses per day per user

---

## 15. Non-Functional Requirements

### Performance

- App cold start: < 3 seconds
- Balance calculation: < 500ms (served from database, not computed on demand)
- Settlement transaction construction: < 2 seconds
- Solana transaction confirmation: typically 400–800ms (handled async with loading state)

### Reliability

- Backend uptime: 99.5% (Railway provides this on hobby plan)
- Supabase uptime: 99.9% (Supabase SLA)
- If Helius is down: show cached balance data, disable Settle Up button with message

### Accessibility

- Support system font size scaling
- Minimum touch target: 44x44px
- Color contrast ratio: minimum 4.5:1
- All interactive elements have accessible labels

### Offline Support

- Groups and expenses viewable offline (cached by TanStack Query)
- Adding expenses requires internet (to sync to backend)
- Settlement requires internet (blockchain transaction)
- Show "Offline — changes will sync when connected" banner

### Localization

- All monetary amounts displayed in user's preferred currency (USD default)
- USDC amounts always shown alongside display currency
- Date formatting based on device locale
- Support English only at launch (additional languages post-MVP)

---

## 16. Out of Scope (v1)

The following features are explicitly excluded from the MVP to maintain focus:

- **iOS App Store listing** — PWA only for iOS at launch (Apple restrictions on crypto in-app)
- **Expense categories and tags** — keep it simple for MVP
- **Receipt photo upload** — nice to have, post-MVP
- **Multi-token support** — USDC only at launch (no SOL, ETH, USDT)
- **Cross-chain settlement** — Solana only at launch
- **Recurring expenses** — premium feature, post-MVP
- **CSV/PDF export** — premium feature, post-MVP
- **In-app chat per group** — use existing messaging apps for now
- **Smart contract escrow** — v1 uses direct transfers only
- **Fiat on-ramp** — users must already have USDC in their wallet
- **Token-gated group access** — post-MVP social feature
- **Public group profiles** — post-MVP

---

## 17. Milestones & Timeline

### Week 1–2: Foundation

- [ ] Supabase project setup — schema, RLS policies, seed data
- [ ] Express backend scaffolding — auth, users, groups endpoints
- [ ] React Native Expo project setup — navigation, NativeWind, basic screens
- [ ] Wallet auth flow (challenge/sign/verify)
- [ ] Home screen + Group creation + Add member flow
- [ ] Privy integration for email sign-in

**Checkpoint:** Can create a group, add members, and authenticate with a wallet

### Week 3: Expense Logic

- [ ] Add expense screen — all split types
- [ ] Expense splits calculation logic (server-side)
- [ ] Simplified debt algorithm (minimize number of transfers)
- [ ] Group detail screen with balances
- [ ] Activity feed
- [ ] Push notifications (Expo)

**Checkpoint:** Full group expense workflow working end-to-end

### Week 4: Settlement Flow

- [ ] Helius RPC integration
- [ ] `buildSettlementTransaction` function (SPL token multi-transfer)
- [ ] ATA existence check + creation
- [ ] Mobile Wallet Adapter integration (Seed Vault on Seeker)
- [ ] Phantom wallet adapter for web
- [ ] Settlement confirmation + verification
- [ ] Success screen + balance update

**Checkpoint:** Full settle-up flow working on Solana devnet

### Week 5: Polish + Solana dApp Store

- [ ] Switch from devnet to mainnet
- [ ] Error handling for all edge cases (insufficient USDC, network failure, etc.)
- [ ] Loading states and skeleton screens
- [ ] Offline support
- [ ] EAS Build — generate Android APK
- [ ] Solana dApp Store `config.yaml` and listing assets
- [ ] Submit to Solana dApp Store
- [ ] PWA manifest for web version

**Checkpoint:** Submitted to Solana dApp Store, live on mainnet

### Week 6: Launch

- [ ] Beta test with 20–50 real users
- [ ] Fix critical bugs from beta
- [ ] Set up analytics (PostHog free tier)
- [ ] Solana Foundation grant application
- [ ] Launch post in Superteam DAO, Solana Discord, Twitter

---

## 18. Open Questions

| Question | Owner | Notes |
|---|---|---|
| What happens if a recipient doesn't have a USDC ATA? | Engineering | Need to decide: auto-create (adds ~$0.002 cost to payer) or show error and guide recipient to create one |
| How do we handle USDC price display vs settlement? | Product | Expenses logged in USD display value, settled in USDC at 1:1. If USDC depegs (rare), amounts could differ slightly. Acceptable? |
| Non-crypto user UX for settling: how do they fund their Privy wallet? | Product | Need a fiat onramp flow. Options: Coinbase onramp, MoonPay, or guide them to buy USDC on Coinbase and transfer in |
| What is the simplified debt algorithm? | Engineering | Recommend the "net balance greedy" algorithm: sort by balance, repeatedly match biggest creditor with biggest debtor |
| Do we need a Terms of Service before launch? | Legal | Yes — platform handles financial transactions. Need ToS + Privacy Policy. Use a template service (Termly.io) |
| Should we support SOL as a settlement token in addition to USDC? | Product | Deferred to v2. USDC is stable and familiar, reducing confusion |
| How do we handle a failed transaction (user signed but Solana rejected)? | Engineering | Show error state, don't mark debts as settled, allow retry |
| Rate limiting on the settlement endpoint — how to handle coordinated attacks? | Security | Implement wallet-based rate limiting server-side. Monitor via Helius webhook alerts |

---

## Appendix A: Simplified Debt Algorithm

Given a group with N members, each having a net balance, compute the minimum number of transfers to settle all debts.

```typescript
interface Balance {
  userId: string;
  walletAddress: string;
  netBalance: number; // positive = owed money, negative = owes money
}

interface Transfer {
  fromUserId: string;
  toUserId: string;
  fromWallet: string;
  toWallet: string;
  amount: number;
}

function simplifyDebts(balances: Balance[]): Transfer[] {
  const transfers: Transfer[] = [];
  
  // Separate into creditors (net positive) and debtors (net negative)
  const creditors = balances
    .filter(b => b.netBalance > 0.001) // ignore dust
    .sort((a, b) => b.netBalance - a.netBalance);
  
  const debtors = balances
    .filter(b => b.netBalance < -0.001)
    .sort((a, b) => a.netBalance - b.netBalance); // most negative first

  let ci = 0; // creditor index
  let di = 0; // debtor index

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];

    const amount = Math.min(creditor.netBalance, Math.abs(debtor.netBalance));
    amount = Math.round(amount * 1_000_000) / 1_000_000; // round to 6 decimal places

    transfers.push({
      fromUserId: debtor.userId,
      toUserId: creditor.userId,
      fromWallet: debtor.walletAddress,
      toWallet: creditor.walletAddress,
      amount,
    });

    creditor.netBalance -= amount;
    debtor.netBalance += amount;

    if (Math.abs(creditor.netBalance) < 0.001) ci++;
    if (Math.abs(debtor.netBalance) < 0.001) di++;
  }

  return transfers;
}
```

---

## Appendix B: Solana dApp Store Submission Checklist

- [ ] `config.yaml` with app metadata, category tags, screenshots
- [ ] App icon: 512x512 PNG, no transparency
- [ ] Feature graphic: 1024x500 PNG
- [ ] Screenshots: minimum 2, recommended 5–8
- [ ] Short description: max 80 characters
- [ ] Full description: max 4000 characters, mention Seed Vault and USDC
- [ ] Privacy policy URL
- [ ] Terms of service URL
- [ ] Android APK signed with release keystore
- [ ] Target Android API level 34+
- [ ] Mobile Wallet Adapter declared in `config.yaml`
- [ ] Category: `finance` + `tools`

---

## Appendix C: Environment Variables

```bash
# Backend (.env)
NODE_ENV=production
PORT=3000
JWT_SECRET=<generate with: openssl rand -hex 64>

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Solana
HELIUS_API_KEY=your-helius-api-key
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}
PLATFORM_WALLET_ADDRESS=<your Solana wallet address for fee collection>
USDC_MINT_ADDRESS=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Privy
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret

# Frontend (.env.local)
EXPO_PUBLIC_API_URL=https://api.splitsol.app/v1
EXPO_PUBLIC_PRIVY_APP_ID=your-privy-app-id
EXPO_PUBLIC_HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=xxx
EXPO_PUBLIC_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
EXPO_PUBLIC_PLATFORM_WALLET=<your fee collection wallet>
```

---

*Document prepared for SplitSOL v1.0 — May 2026*  
*This PRD is intended for use with Cursor, Claude, and other AI-assisted development tools.*  
*All monetary amounts are in USD unless otherwise specified. All blockchain settlements are in USDC on Solana Mainnet.*
