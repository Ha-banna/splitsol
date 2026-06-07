# SplitSOL Backend

Express + TypeScript API backed by Supabase (PostgreSQL) and Solana (USDC settlements).

## Setup

1. Copy `.env.example` to `.env` and fill in values.
2. Run `supabase/schema.sql` in your Supabase SQL editor.
3. Install and start:

```bash
npm install
npm run dev
```

API base: `http://localhost:3000/v1`

## Auth

**Wallet**
1. `POST /v1/auth/wallet/challenge` — `{ "wallet_address": "..." }`
2. Sign the returned `message` with your wallet.
3. `POST /v1/auth/wallet` — `{ "wallet_address", "signed_message", "signature" }`

**Email (Privy)**
- `POST /v1/auth/email` — `{ "privy_token": "..." }`

Use `Authorization: Bearer <token>` on all other routes.

## Key endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me` | Current user |
| GET | `/groups` | List groups with balances |
| POST | `/groups` | Create group |
| GET | `/groups/:id` | Group detail |
| POST | `/groups/:id/expenses` | Add expense |
| GET | `/groups/:id/balances` | Balances + simplified debts |
| POST | `/groups/:id/settlements/prepare` | Build unsigned Solana tx |
| POST | `/groups/:id/settlements/confirm` | Record confirmed settlement |
| GET | `/activity` | Activity feed |

See [SplitSOL_PRD.md](../SplitSOL_PRD.md) for full specification.

## Tests

```bash
npm test
```

Covers all `/v1` endpoints (mocked services), rate limiting (429 responses), and security policy (no passwords in DB; scrypt hashing utility for future use).

## Rate limits (PRD §14)

| Scope | Limit |
|-------|--------|
| Global API | 300 / 15 min per IP |
| Auth | 30 / 15 min per IP |
| Settlement | 10 / min per wallet |
| Create group | 20 / day per user |
| Create expense | 100 / day per user |

## Passwords

SplitSOL does **not** store user passwords. Sign-in is wallet signature or Privy. `JWT_SECRET` lives only in environment variables, not in the database. If password auth is added later, use `hashPassword()` from `src/lib/password.ts` (scrypt + per-password salt).
