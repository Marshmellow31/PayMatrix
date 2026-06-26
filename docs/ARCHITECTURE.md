# PayMatrix — Architecture Overview

## System Diagram

```
Browser (React 19 + Vite PWA)
        │
        │  Firestore SDK (offline-first, IndexedDB cache)
        │  Firebase Auth SDK
        │  Firebase Storage SDK
        │  Firebase Messaging SDK (FCM)
        ▼
   Firebase Platform (paymatrix-174b5)
        ├── Firestore (primary data store)
        ├── Firebase Auth (Google OAuth + Custom Claims)
        ├── Cloud Functions v2 (Node 20)
        │       ├── sendPushOnNotification
        │       ├── adminManageUser
        │       ├── getAdminStats
        │       ├── broadcastNotification
        │       ├── scanBillWithGemini      ← Gemini API key never leaves server
        │       └── createCrossUserNotification
        ├── Cloud Storage (receipt images — future)
        └── FCM (push notifications)
```

## Frontend Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 with Vite 6.3 |
| State | Redux Toolkit 2.6 + Redux Persist |
| Routing | React Router 7 |
| Styling | Tailwind CSS 3.4 |
| Animation | Framer Motion |
| Validation | Zod 4 |
| Sanitisation | DOMPurify |
| PWA | vite-plugin-pwa (Workbox, injectManifest mode) |

## Data Flow

### Expense creation
1. User fills form → `AddExpense` page
2. `expenseService.addExpense` validates with Zod, sanitises with DOMPurify
3. `calculateSplits` (balanceEngine) computes per-member amounts
4. `withRetry(() => setDoc(docRef, payload))` writes to Firestore (awaited)
5. Background task: resolve names → write activity log → send notifications via `createCrossUserNotification` Cloud Function
6. Redux slice updates optimistically; `onSnapshot` listeners reconcile

### Balance calculation
- Client-side only: `computeGroupBalances(expenses, settlements, members)`
- `simplifyDebts` runs a greedy min-flow algorithm to minimise transaction count
- All arithmetic uses `round2(x) = Math.round(x * 100) / 100` to suppress float drift

### Admin flow
1. First admin: use VITE_ADMIN_PASSWORD in-memory password form → access granted per session
2. Admin grants themselves Custom Claims via Admin Panel → Users → Grant Admin
3. Subsequent sessions: Custom Claims checked via `getIdTokenResult(true)` — no password needed
4. Firestore rules enforce `request.auth.token.admin == true` for admin-only collections

### Push notifications
1. User logs in → `usePushNotifications` requests FCM permission
2. FCM token saved to `users/{uid}.fcmToken`
3. When a notification doc is created → `sendPushOnNotification` Cloud Function fires
4. Function reads FCM token → sends push via `admin.messaging().send()`
5. Stale tokens cleaned up automatically on `messaging/registration-token-not-registered`

## Offline Support

Firebase IndexedDB persistence is enabled in `src/config/firebase.js`. This means:
- All `getDocs` / `getDoc` calls fall back to cache when offline
- `setDoc` / `updateDoc` resolve from local cache and sync when reconnected
- `onSnapshot` listeners continue to fire from cached data

## Security Architecture

See [SECURITY.md](./SECURITY.md) for the full threat model and controls.

Key design decisions:
- Custom Claims are the single source of truth for admin status
- Cross-user Firestore writes are blocked by rules; routed through Cloud Functions
- The Gemini API key lives only in Cloud Functions env vars, not the browser bundle
- `sessionStorage` is not used for any PII; in-memory caches are cleared on logout
