# Run SplitSOL on Solana Seeker / Android

This app targets **Solana Seeker** via **Mobile Wallet Adapter (Seed Vault)** for sign-in and **real USDC** send/settle. Use a **custom dev build** — not Expo Go.

---

## One-time: build and install

```bash
cd frontend
npm i -g eas-cli && eas login
npm run build:android:dev
```

Install the APK on your Seeker from the EAS link.

---

## Every session

1. **Backend** on your PC (same Wi‑Fi or tunnel):
   ```bash
   cd backend && npm run dev
   ```
   Set in `backend/.env`:
   ```env
   HELIUS_API_KEY=your_key
   PLATFORM_WALLET_ADDRESS=your_fee_wallet
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm run start:dev:tunnel
   ```
   Open the **SplitSOL dev app** on Seeker and scan the QR.

3. **Sign in** with Seed Vault when prompted.

---

## Real USDC on Seeker

| Asset | Needed for |
|--------|------------|
| **USDC** (mainnet SPL) | Send to friends, group settle (debts + $0.25 fee) |
| **SOL** | Network transaction fees |

Settle/send opens **Seed Vault** to approve the transaction (same as web Phantom, but native on Seeker).

---

## Run SplitSOL on a physical Android phone (non-Seeker)

This app uses **Expo SDK 55**. The Expo Go app from the **Play Store is still SDK 54**, so it cannot open this project unless you use one of the paths below.

Do **not** run plain `npx expo start` unless you know which mode you want. Use the npm scripts instead.

---

## Option A — Development build (recommended)

Wallet / Seeker signing (login, send, settle) need a **custom dev build**, not store Expo Go.

### One-time: build and install the APK

1. Install EAS CLI and log in: `npm i -g eas-cli` then `eas login`
2. From `frontend/`:

   ```bash
   npm run build:android:dev
   ```

3. When the build finishes, open the EAS link on your phone and install the **SplitSOL** development APK.
4. Allow “Install unknown apps” if Android asks.

### Every dev session

1. Backend: `cd backend && npm run dev`
2. Frontend:

   ```bash
   cd frontend
   npm run start:dev
   ```

   If LAN fails: `npm run start:dev:tunnel`

3. Open the **SplitSOL** app you installed (not Expo Go).
4. Scan the QR code shown in the terminal (it will say **development build**).

---

## Option B — Expo Go for SDK 55 (UI only)

Play Store Expo Go will show “incompatible” or wrong scheme errors.

1. Install **Expo Go for SDK 55** on your phone:  
   https://expo.dev/go?sdkVersion=55&platform=android&device=true  
   (USB + Orbit, or scan the QR on that page — not the Play Store app.)
2. Start Metro for Expo Go:

   ```bash
   cd frontend
   npm run start:go
   ```

   If you see “webpage not available”: `npm run start:go:tunnel`

3. Open **that** Expo Go app and scan the QR (terminal should say **Expo Go**, not development build).

Wallet / Seeker signing will not work in Expo Go; use Option A for real wallet flows.

---

## Common mistakes

| Symptom | Cause | Fix |
|--------|--------|-----|
| “Please build and install a compatible **Development build**” (`exp+splitsol://…`) | QR is for dev client; you opened **Expo Go** or have no dev APK | Option A: install dev APK, use `npm run start:dev` |
| “Project is incompatible with this version of **Expo Go**” | Play Store Expo Go is SDK 54 | Install SDK 55 Expo Go from expo.dev/go (Option B) or use Option A |
| “**Webpage not available**” | Phone cannot reach PC on LAN | `npm run start:go:tunnel` or `start:dev:tunnel`; allow Node in Windows Firewall |
| Scanned with **Camera** or **Chrome** | Wrong app | Use Expo Go or your SplitSOL dev build only |

In the terminal you can press **`s`** to switch between Expo Go and development build, but you still need the matching app installed on the phone.
