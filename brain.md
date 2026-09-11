# PayMatrix — Project Brain

> Reference doc so Claude can work without re-reading the whole tree. Keep this updated when structure or key decisions change.

## What it is
PayMatrix is a premium **expense-sharing / settlement PWA** (Splitwise-style) with a dark "Digital Obsidian" UI. Group expenses, min-flow settlement suggestions, AI bill scanning, analytics, and UPI settlement. Live: https://pay-matrix.vercel.app

## Tech stack
- **Frontend:** React 19 + Vite 6, Redux Toolkit + redux-persist, React Router 7, Tailwind 3, Framer Motion, lucide-react, Chart.js + react-chartjs-2, qrcode.react, jsPDF, zod, dompurify.
- **Backend:** Firebase (Auth, Firestore, Cloud Functions, FCM push), Gemini (bill scan). PWA via vite-plugin-pwa.
- **Tooling:** ESLint 8 (flat config in eslintrc), Prettier, Vitest. CI requires lint + prettier to pass.
- Node 22. Package manager: npm. Frontend lives in `frontend/`.

## Repo layout
```
PayMatrix/
  frontend/            # the app (cd here for npm scripts)
    src/
      pages/           # route screens
      components/      # balance/ bill/ charts/ common/ expense/ group/ layout/
      services/        # firestore/data access layer
      hooks/           # useAuth, useFeatureFlags, useBillScanner, ...
      redux/           # authSlice, expenseSlice, groupSlice, notificationSlice, store
      utils/           # balanceEngine, upiUtils, formatCurrency, constants, ...
      config/firebase.js
      App.jsx main.jsx
  functions/           # Firebase Cloud Functions (index.js)
  firestore.rules
  firebase.json  .firebaserc
  scripts/  docs/  stitch_authentication/
```

## Frontend pages (routes)
`/login /register /join/:code /join-friend /dashboard /friends /friends/:id /groups /groups/:id /groups/:id/add-expense /add-expense /analytics /copilot /settlements /activity /profile`
Admin (nested under `/admin`): users, groups, notifications, analytics, ai-scans, security, flags.

Key page files: `Dashboard.jsx`, `GroupDetail.jsx`, `Profile.jsx`, `Copilot.jsx`, `Analytics.jsx`, `GlobalSettlements.jsx`, `Friends.jsx`, admin pages in `pages/admin/`.

## Key components
- `components/group/SettleUpModal.jsx` — settle-up flow + **UPI QR payment modal**.
- `components/bill/BillScannerModal.jsx` — Gemini OCR receipt scan.
- `components/layout/` — AppLayout, Header, Sidebar (desktop), BottomNav (mobile), SyncStatus.
- `components/common/` — Modal, Button, Input, Avatar, Loader, InstallPrompt, ErrorBoundary.

## Services & state
- Services wrap Firestore reads/writes: `groupService`, `expenseService`, `friendService`, `authService`, `adminService`, plus `sanitizationService`, `validationService`, `rateLimitService`, `loggingService`, `fcmService`.
- Redux slices: auth, groups, expense, notifications (persisted via redux-persist).
- `utils/balanceEngine.js` — core min-flow settlement algorithm (has a vitest test `balanceEngine.test.js`).

## Cloud Functions (functions/index.js)
`scanBillWithGemini`, `sendPushOnNotification`, `createCrossUserNotification`, `broadcastNotification`, and admin fns: `adminListGroups/adminGetGroupDetails/adminArchiveGroup/adminDeleteGroup/adminManageUser/getAdminStats`.

## Feature flags (`hooks/useFeatureFlags.js`, Firestore `config/featureFlags`)
Defaults: `billScanning, friendRequests, groupCreation, upiDeepLinks, analyticsPage = true`; `maintenanceMode = false`. Toggle in Admin → flags. `upiDeepLinks` gates the "Pay via UPI" button.

## UPI payments — IMPORTANT decision (June 2026)
- PayMatrix settle-up pays a friend's **personal UPI ID (VPA)**, i.e. P2P.
- **Deep links / app-intents that push a payment to a personal VPA are blocked** by GPay/PhonePe/Paytm risk policy (NPCI rule). Removing the amount does NOT fix it; it fails regardless. Verified-merchant signing only applies to PSP/merchant collection, not P2P.
- **Current approach (kept):** generate a **UPI QR** (`upi://pay?pa=&pn=&am=&cu=INR`, amount pre-filled — a scanned QR is user-initiated and not flagged) + **Copy UPI ID** fallback. `Mark Paid` records the settlement in the ledger.
- `utils/upiUtils.js` exports: `UPI_APPS`, `detectPlatform`, `validateUPIId`, `hasPaymentMethod`, `getUPIQRValue`, `getAppLabel`. (Old `getAppDeepLink/handleSmartPayment/IOS_CHOOSER_APPS` were removed.)
- QR rendered with `qrcode.react` `QRCodeCanvas` (white bg, marginSize). "Save QR" uses **Web Share API** (`navigator.share({files})`) so mobile gets native "Save to Photos"; desktop falls back to download. A PWA cannot silently write to the gallery — share sheet is the sanctioned path.
- The "Preferred App" picker was removed from `Profile.jsx` (was only used by the deleted deep-link flow).

## iOS distribution note
- The PWA installs on iOS via Safari → Add to Home Screen (free). A **native** iOS app needs a Mac + Xcode and a paid Apple Developer membership ($99/yr) for any distribution (TestFlight/Ad Hoc/App Store) — not worth it here.

## ⚠️ Environment gotchas (sandbox)
- This repo is a **Windows folder mounted into a Linux sandbox**. Two big consequences:
  1. **Large file-tool writes can truncate on disk.** A ~18KB Edit/Write to a mounted file truncated silently (lint then "Unexpected token" at the cut point). For big rewrites, prefer writing via bash/python and **verify with `wc -l` / a lint run** afterward. Avoid mixing `sed -i` with the file tools on the same file in one pass.
  2. **`node_modules` has Windows binaries.** `npm run build` / `vitest` won't run in the Linux sandbox (esbuild is win32). Run ESLint cross-platform with:
     `node node_modules/eslint/bin/eslint.js src/<file>`
- Always lint changed files this way before declaring done. The user's CI fails on lint/prettier issues (max-warnings matters).

## Conventions
- Tailwind utility classes only; dark theme (`bg-white/[0.0x]`, `text-white/xx`, emerald/indigo/violet accents), `font-manrope`/`font-inter`, heavy rounded-2xl/3xl, framer-motion entrance animations.
- Responsive: mobile-first; desktop uses `lg:` breakpoints (e.g. Dashboard is `max-w-md` mobile → `lg:max-w-6xl` 12-col grid).
- Firestore access goes through `services/*`, not inline in components where avoidable.

## Recent changes log
- Removed UPI deep-link auto-open + iOS app chooser; replaced with QR + Copy UPI ID (SettleUpModal, upiUtils).
- QR "Save" now uses Web Share API → Save to Photos / download fallback.
- Removed "Preferred App" setting from Profile.jsx (+ its state/handler/UPI_APPS import).
- Dashboard.jsx optimised for desktop (responsive 12-col grid; mobile unchanged).
