# PayMatrix — Security Model

## Threat Model

PayMatrix is a financial application. A security bug can cause real monetary disputes. The following threats are explicitly modelled:

| Threat | Mitigation |
|--------|-----------|
| Privilege escalation (claim admin without credentials) | Admin status derives solely from Firebase Custom Claims (`token.admin === true`). No UID hardcoding. |
| DevTools bypass of admin gate | Admin state lives in React component state only — never `sessionStorage` or `localStorage`. |
| Cross-user notification spam | Firestore rules block `notifications` creates where `to !== auth.uid`. Cross-user writes go through `createCrossUserNotification` Cloud Function which validates group membership. |
| User profile scraping | `users/{userId}` read requires `auth.uid == userId` or `auth.uid in friends[]`. Global read removed. |
| Settlement fraud (payer deletes their own debt) | Hard-delete on settlements requires group admin. Payers can only soft-delete (status change). |
| Rate-limit manipulation | `rate_limits` collection is write-restricted to global admins. Clients can only read their own doc. |
| API key exposure (Gemini) | `VITE_GEMINI_API_KEY` is no longer used client-side. Gemini calls go through `scanBillWithGemini` Cloud Function. |
| PII leakage via sessionStorage | `groupService` userCache is in-memory only. Cache is cleared on logout via `clearUserCache()`. |
| Financial data loss (fire-and-forget writes) | All primary Firestore writes in `expenseService` are now `await`-ed with `withRetry()`. |
| Service account key exposure | `scripts/serviceAccountKey.json` is checked into git. **Rotate this key immediately** (see below). |
| XSS via user-generated content | DOMPurify sanitises all user-provided strings before they reach Firestore. |

## Firestore Security Rules Summary

| Collection | Read | Write |
|-----------|------|-------|
| `users/{uid}` | Own doc or friends; global admin | Own doc with field restrictions |
| `groups/{id}` | Members + historical members | Members (join/leave); admin (update/delete) |
| `groups/{id}/expenses` | Members | Members (create/update/delete) |
| `groups/{id}/settlements` | Members | Create: members; Delete: admin only |
| `groups/{id}/logs` | Members | Members create; no update/delete |
| `notifications/{id}` | Recipient | Self-notifications only; cross-user via Cloud Function |
| `security_logs` | Global admin | Any signed-in user (append-only) |
| `rate_limits/{uid}` | Own doc | Global admin only |
| `ai_requests` | Own requests | Any signed-in user (create) |
| `config` | Any signed-in user | Global admin |
| `admin_notifications` | Global admin | Global admin |

## Critical: Rotate the Service Account Key

`scripts/serviceAccountKey.json` contains a live RSA private key committed to git.

**Steps to rotate (Firebase Console):**
1. Open [Firebase Console](https://console.firebase.google.com) → Project settings → Service accounts
2. Click **Generate new private key** → save the new JSON file securely (do NOT commit it)
3. Delete the old key from the Service Accounts list
4. Remove `scripts/serviceAccountKey.json` from the repository:
   ```
   git rm scripts/serviceAccountKey.json
   echo "scripts/serviceAccountKey.json" >> .gitignore
   git commit -m "security: remove committed service account key"
   ```
5. If the repo is public or has been pushed, consider the old key compromised and rotate all Firebase project credentials.

## Admin Bootstrap

The first admin is granted via:
1. Log in to PayMatrix
2. Navigate to `/admin` → enter `VITE_ADMIN_PASSWORD`
3. Go to Admin Panel → Users → find your account → **Grant Admin Claims**
4. Sign out and sign back in (Custom Claims update requires token refresh)
5. You now have permanent admin access without a password prompt

Once Custom Claims are set, `VITE_ADMIN_PASSWORD` becomes a break-glass fallback only.

## Environment Variables

| Variable | Used in | Secret? | Notes |
|----------|---------|---------|-------|
| `VITE_FIREBASE_API_KEY` | Frontend | No | Safe to expose; restricted by Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Frontend | No | Public |
| `VITE_FIREBASE_APP_ID` | Frontend | No | Public |
| `VITE_FIREBASE_MEASUREMENT_ID` | Frontend | No | Public |
| `VITE_GEMINI_API_KEY` | **No longer used in frontend** | Yes | Moved to Cloud Functions env: `GEMINI_API_KEY` |
| `VITE_ADMIN_PASSWORD` | Frontend (in-memory only) | Yes | Bootstrap only; rotate after first admin grants Custom Claims |
| `GEMINI_API_KEY` | Cloud Functions | Yes | Set via Firebase Console → Functions → Configuration |
