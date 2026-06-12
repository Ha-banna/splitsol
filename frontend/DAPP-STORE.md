# SplitSOL — Solana dApp Store (Seeker) submission

Your app is already MWA-ready (`com.splitsol.app`, mainnet USDC, prod API on Railway).
Submission is done through the **Publisher Portal**, not a local `config.yaml`.

Portal: https://publish.solanamobile.com

Docs: https://docs.solanamobile.com/dapp-store/submit-new-app

---

## 1. Publisher account

1. Sign up at https://publish.solanamobile.com
2. Complete publisher profile + KYC/KYB
3. Connect a **publisher wallet** (Phantom/Solflare) — keep this wallet forever (~0.2 SOL for fees/uploads)
4. Choose **ArDrive** as storage provider

---

## 2. Prepare listing assets

| Asset | Spec |
|---|---|
| App icon | 512×512 PNG, **no transparency** |
| Feature graphic | 1024×500 PNG |
| Screenshots | Min 2, recommended 5–8 (Seeker phone aspect) |
| Short description | Max 80 chars |
| Long description | Max 4000 chars — mention USDC settle-up, groups, MWA / Seed Vault on Seeker |
| Privacy policy URL | Public HTTPS (not Notion workspace links) |
| Terms of service URL | Public HTTPS |

Host `tos.html` and `privacy policy.html` from the repo root at e.g.:

- `https://splitsol.app/terms`
- `https://splitsol.app/privacy`

Also host `app-icon.png` at `https://splitsol.app/app-icon.png` (used by MWA identity).

Update `frontend/src/lib/legal.ts` to those URLs before the store build.

Categories: **finance** + **tools**

---

## 3. EAS secrets (one-time)

Set on Expo dashboard or via CLI — required for the store APK:

```bash
cd frontend
eas secret:create --name EXPO_PUBLIC_PRIVY_APP_ID --value "your-privy-app-id"
eas secret:create --name EXPO_PUBLIC_PLATFORM_WALLET --value "your-platform-wallet"
```

Do **not** put Helius keys in the client build (backend handles RPC).

---

## 4. Build the signed APK

The dApp Store requires an **APK**, not an AAB.

```bash
cd frontend
npm run build:dapp-store
```

Profile: `eas.json` → `dapp-store` (APK, prod API URL baked in).

- First build: EAS prompts to create or upload an Android keystore — **save credentials securely**
- Use a **separate** keystore from Google Play if you publish there later
- Download the `.apk` when the build finishes

Verify signing (optional, needs Android build-tools):

```bash
apksigner verify --print-certs your-app.apk
```

---

## 5. Add dApp in the portal

1. Portal → **Add a dApp** → **New dApp**
2. Fill metadata (name, descriptions, URLs, screenshots)
3. Android package: **`com.splitsol.app`** (must match `app.json`)
4. Declare **Mobile Wallet Adapter** support
5. Save draft

---

## 6. Submit first release

1. Open your dApp → **New Version**
2. Upload the APK from step 4
3. Add “What’s new” text
4. **Submit** — approve all wallet signing prompts (Arweave upload + release NFT)

Review: 3–5 business days → `publishersupport@dappstore.solanamobile.com`

---

## 7. Future updates

Build a new APK (increment `version` in `app.json`), then either:

- Portal → **New Version** → upload APK, or
- CLI:

```bash
npm install -g @solana-mobile/dapp-store-cli
export DAPP_STORE_API_KEY=...   # from portal → Settings → API keys
dapp-store --apk-file ./SplitSOL.apk --keypair ./publisher-keypair.json --whats-new "Bug fixes"
```

---

## Pre-submit checklist

- [ ] Prod backend smoke test passes (`npm run test:prod-smoke` in `backend/`)
- [ ] `auth_challenges.sql` run in Supabase
- [ ] Public ToS + privacy URLs live
- [ ] Login + settle + send tested on a physical Android device
- [ ] APK built with `dapp-store` profile (not dev client)
- [ ] Package name `com.splitsol.app` matches portal entry
