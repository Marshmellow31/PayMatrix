# PayMatrix — Security & Code Review

**Date:** 2026-07-16
**Scope:** `frontend/` (React app + `/api` serverless), `functions/`, `firestore.rules`, `scripts/`, repo hygiene.
**Method:** manual source review of security rules, Cloud Functions, service layer, auth/admin flows, and secret handling, plus `npm audit`.

> This is a point-in-time review. Severities are the reviewer's judgement. Nothing here moves money on its own, but several issues affect confidentiality (API-key theft, notification phishing) and data integrity (settlement tampering).

---

## ✅ Remediation Status — 2026-07-16

All High and Medium findings have been addressed, and the AI Copilot feature (the source of H-1) was removed entirely at the owner's request. Verified with `npm run build`, `npm run lint`, and `npm test` (22/22 passing) after the changes.

| ID | Finding | Status | What changed |
| :- | :--- | :--- | :--- |
| H-1 | Gemini key in browser bundle | ✅ Fixed | **Copilot feature removed** (page, routes, nav). It was the only client-side Gemini caller. `VITE_GEMINI_API_KEY` deleted from `.env.example` and CI. Only server path (`/api/scan-bill`) remains. **Rotate the old key.** |
| H-2 | Notification phishing/spam | ✅ Fixed | `notifications` create rule now requires `to == auth.uid`. Cross-user notifications rerouted through the `createCrossUserNotification` Cloud Function (`notificationHelper.js`). |
| M-1 | Rate limiting fail-open | ✅ Fixed | `rateLimitService` now fails **closed** on contention/unexpected errors; only genuine offline is allowed. |
| M-2 | Member can tamper with settlements/expenses | ✅ Fixed | Update rules restrict financial-field edits to the creator/payer or group admin; other members may only flip `status`. |
| M-3 | Client-side admin password | ✅ Fixed | `AdminRoute` is now custom-claim-only; password path and `VITE_ADMIN_PASSWORD` removed. |
| M-4 | Dead/misleading admin grant code | ✅ Fixed | `grantAdmin`/`revokeAdmin`/`suspend`/`enable`/`clearFcm`/`broadcast` now call the admin-gated Cloud Functions; the unused `isAdmin` field write is gone. |
| M-5 | Two divergent AI backends | ✅ Fixed | Dead `scanBillWithGemini` Cloud Function removed; `/api/scan-bill` is the single AI path. |
| M-6 | Vulnerable dependencies | ⚠️ Mostly fixed | `npm audit fix` cut 18 → 5; Vite bumped to a patched 6.4.x. Remaining 5 are **dev-only** (vitest/vite-node/esbuild) and need a deliberate vitest v3 major upgrade. |
| L-1 | Committed debug logs / docx | ✅ Fixed | `git rm --cached` on the debug logs and audit `.docx`; `.gitignore` updated. |
| L-2 | Hard-coded admin email in script | ✅ Fixed | `set-admin.js` now takes the email as a CLI arg and no longer writes `isAdmin`. |
| L-4 | Friend-request anti-abuse | ✅ Fixed | Rule now rejects self-requests and empty `to`. |
| L-6 | Weak CSP | ✅ Improved | `'unsafe-inline'` removed from `script-src` (the app has no inline scripts). Smoke-test the deployed build. |

**Follow-ups still recommended:** rotate the Gemini API key; verify the Gemini model id in `scan-bill.js` against the current model list; consider rate-limiting `createCrossUserNotification` server-side; plan the vitest v3 upgrade. The original findings below are kept for reference.

---

## Executive Summary

The project has clearly been through at least one security hardening pass — the rules file and functions carry `FIX SEC-0x` comments, admin auth is (mostly) on custom claims, DOMPurify + Zod are wired in, and the settle-up flow correctly avoids risky UPI deep links. That's a good baseline.

However, there are **two high-impact issues that are live in the code**:

1. **The Gemini API key is exposed in the browser bundle** (`Copilot.jsx` calls Gemini directly with `VITE_GEMINI_API_KEY`). Anyone can extract it and run up your bill.
2. **The "notifications" rule does not actually restrict the recipient** — any signed-in user can create a notification (with attacker-controlled text) targeting *any* other user, which then fires a real OS push. This is a phishing/spam vector, and the fix comment in the rules claims it was closed when it was not.

Plus a scatter of medium issues (fail-open rate limiting, settlement/expense write rules that let any member tamper, dead/misleading admin code, a client-side admin password) and repo-hygiene problems (committed debug log and audit `.docx` files, a hard-coded admin email).

---

## Findings

### 🔴 HIGH

#### H-1 — Gemini API key shipped to the browser
**Files:** `frontend/src/pages/Copilot.jsx:21,407`, `frontend/.env.example:21`
The Copilot builds `https://…/generateContent?key=${GEMINI_API_KEY}` where `GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY`. Every `VITE_*` variable is inlined into the production JS bundle, so the key is trivially recoverable from DevTools or the deployed assets. An attacker can use it to make Gemini calls billed to you, or exhaust your quota (DoS of your own AI features).
This directly contradicts the bill-scanner's own comment ("`VITE_GEMINI_API_KEY` is no longer exposed in the browser bundle") — the scanner was moved server-side but the Copilot was not.
**Fix:** Route Copilot through a server endpoint (mirror `frontend/api/scan-bill.js`), read the key from `GEMINI_API_KEY` server-side only, delete `VITE_GEMINI_API_KEY` from `.env`/`.env.example`, and **rotate the existing key** (assume it is already compromised if it was ever deployed).

#### H-2 — Notification rule allows cross-user phishing/spam
**Files:** `firestore.rules:193-199`, `frontend/src/utils/notificationHelper.js`
The rule is:
```
allow create: if isSignedIn() && request.resource.data.get('createdBy','') == request.auth.uid;
```
The inline comment says clients "may only create notifications targeting themselves," but the rule never compares `to` to `auth.uid`. Any authenticated user can write `{ to: <any victim>, message: <anything>, createdBy: self }`. The `sendPushOnNotification` function then delivers that text as a real web-push to the victim — a ready-made phishing channel ("Your payment failed, click here…").
**Fix:** Either restrict client creates to self-notifications (`request.resource.data.to == request.auth.uid`) and force all cross-user notifications through the existing `createCrossUserNotification` Cloud Function (which already validates group membership), or add membership/friendship validation to the rule. Update the misleading comment to match reality.

---

### 🟠 MEDIUM

#### M-1 — Rate limiting is fail-open on any error
**File:** `frontend/src/services/rateLimitService.js:66-89`
On offline, contention, *or any other unexpected error*, `checkAndConsume` returns `true` (action allowed) and even logs a `rate-limit-bypass` event. An attacker who can force the transaction to error (e.g. by going offline, or spamming to cause contention) bypasses the limit entirely. Because limits are also client-invoked, the whole mechanism is advisory.
**Fix:** For genuinely sensitive actions, enforce limits server-side (Cloud Function or Firestore-rule counters). At minimum, fail *closed* for non-offline errors.

#### M-2 — Any group member can tamper with settlements & expenses
**File:** `firestore.rules:155-168`
`settlements` update rule is just `allow update: if isMember(groupId)` with no field validation — a member can change another member's settlement `amount`, `payer`, or `payee`, directly manipulating who-owes-whom. Similarly `expenses` update lets any member rewrite any expense's `amount`/`splits`. For trusted small friend groups this may be acceptable, but it means a single malicious/compromised member can silently rewrite the group ledger.
**Fix:** Restrict mutation to the record's creator (`payer`/`admin`) or group admin, validate immutable fields with `diff().affectedKeys()`, and keep the append-only `logs` as the tamper-evident record.

#### M-3 — Client-side admin password in the bundle
**Files:** `frontend/src/App.jsx:63-103`, `.env.example:24`
`AdminRoute` accepts `VITE_ADMIN_PASSWORD` (bundled, therefore public) as a "bootstrap" fallback to unlock the admin UI. Anyone can read it and open the admin console shell. The blast radius is limited because privileged Firestore ops and functions still require the `admin` custom claim (so most admin actions error out for a non-claim user), but it still leaks the admin surface, some listable data, and is an unnecessary secret in the bundle.
**Fix:** Remove the password path entirely; rely solely on the custom claim (already the primary path). Delete `VITE_ADMIN_PASSWORD`.

#### M-4 — Misleading/dead admin grant code
**File:** `frontend/src/services/adminService.js:145-152`
`grantAdmin`/`revokeAdmin` write `{ isAdmin: true/false }` to the user document. Nothing reads `isAdmin` for authorization (auth is custom-claims only), and the Firestore rules would reject a non-self write to another user's doc anyway. So this UI action silently does nothing useful and can mislead an operator into thinking they granted admin. The real grant is the `adminManageUser` Cloud Function.
**Fix:** Point `grantAdmin`/`revokeAdmin` at `httpsCallable(functions, 'adminManageUser')` with the `grantAdmin`/`revokeAdmin` action, and drop the `isAdmin` field.

#### M-5 — Two divergent AI implementations / model drift
**Files:** `frontend/api/scan-bill.js:1` (`gemini-3.1-flash-lite`), `functions/index.js:292` (`gemini-2.0-flash-lite`), `Copilot.jsx:22` (`gemini-3.5-flash`)
The same "scan a bill" capability exists in both a Vercel function and a Firebase function with different models, and the client picks the Vercel one. This is duplicated, drifts, and makes the security story ambiguous (which path is actually deployed?). Model names are also inconsistent and some don't correspond to real published model IDs.
**Fix:** Pick one server home for AI (Vercel *or* Functions), delete the other, and centralise the model name in one constant. Verify the model IDs against the current Gemini model list.

#### M-6 — Vulnerable build/dev dependencies
**File:** `frontend/package-lock.json` (`npm audit`)
`npm audit` reports 18 vulnerabilities (2 critical, 8 high), concentrated in `vite` (path traversal / dev-server file read), `workbox-build`/`@rollup/plugin-terser`, and `websocket-driver`. Most are dev/build-time, so production runtime exposure is limited, but the Vite dev-server issues matter if anyone runs `npm run dev` on an untrusted network.
**Fix:** `npm audit fix`, bump Vite to a patched release, re-test the PWA build.

---

### 🟡 LOW / Hygiene

#### L-1 — Debug logs and internal docs committed to the repo
**Files:** `firebase-debug.log`, `functions/firebase-debug.log`, `PayMatrix_Engineering_Audit.docx`, `PayMatrix_Transformation_Roadmap.docx`, `brain.md`
`firebase-debug.log` is tracked (91 KB; secrets are `[omitted]` in this copy, but debug logs are a bad thing to commit and can leak tokens in other runs). Internal audit `.docx` and `brain.md` notes are also committed.
**Fix:** `git rm --cached` these, add `*-debug.log` and internal docs to `.gitignore`.

#### L-2 — Hard-coded personal admin email in a script
**File:** `scripts/set-admin.js:8`
`const email = '1080patelharshil@gmail.com';` bakes a personal identity into the repo and also writes the unused `isAdmin` field (see M-4). Pass the email as a CLI arg instead.

#### L-3 — `.env.example` ships real-looking placeholders for secrets
`.env.example` includes `VITE_GEMINI_API_KEY` and `VITE_ADMIN_PASSWORD` as if they were normal config. Removing them (per H-1/M-3) also removes the temptation for the next contributor to set them.

#### L-4 — `friendRequests` create lacks anti-abuse checks
**File:** `firestore.rules:185-187`
Create only checks `from == auth.uid` and `to is string`; there's no check that `to != from` or that `to` is a real user, so a user can spam friend-request docs. Low impact (the recipient just sees requests) but combined with H-2 it's another unsolicited-contact channel.

#### L-5 — Fail-open error handling masks real failures broadly
Across services (`friendService`, `expenseService`, `rateLimitService`) many operations `catch` and return an empty/success shape. Good for UX resilience, but it can hide data-integrity failures (e.g. a settlement that didn't actually persist) and makes debugging harder. Consider surfacing critical write failures.

#### L-6 — CSP allows `unsafe-inline` and `unsafe-eval`
**File:** `frontend/vercel.json` (`script-src … 'unsafe-inline' 'unsafe-eval'`)
Weakens the XSS protection the CSP is meant to provide. `unsafe-eval` is often required by some Firebase/build tooling, but `unsafe-inline` for scripts should be removed if possible (nonce/hash-based).

---

## Code-Quality Observations (non-security)

- **Client-side heavy aggregation.** `getSummary`, `getNetworkAnalytics`, `getSpendingTrends`, and the Copilot hydration each fan out N+1 Firestore reads across all groups/subcollections on the client. This is slow and read-cost-heavy at scale; a maintained server aggregate or denormalised balance cache would help.
- **Duplicated components.** There are two `SyncStatus.jsx` files (`components/common` and `components/layout`) — confirm which is canonical and remove the other.
- **Stray build artifacts** in `frontend/` (`vitest.config.js.timestamp-*.mjs`) should be gitignored.
- **Inconsistent response shapes.** Services `wrap()` data to "mimic Axios" (`data.data.data` nesting in places), a legacy shim that adds friction; consider returning plain values now that there's no REST backend.
- **Magic numbers / thresholds** (₹1,000,000 cap, 30s summary TTL, 2s rate-limit debounce) are scattered; centralise in `utils/constants.js`.
- **`experimentalForceLongPolling: true`** is set globally in `config/firebase.js` — fine as a connectivity workaround, but it disables the more efficient WebChannel transport; verify it's still needed.

---

## Prioritised Remediation Plan

| # | Action | Severity | Effort |
| :- | :--- | :--- | :--- |
| 1 | Move Copilot AI calls server-side; delete `VITE_GEMINI_API_KEY`; **rotate the key** | 🔴 H-1 | M |
| 2 | Fix `notifications` create rule to bind `to` (or force via Cloud Function); fix the comment | 🔴 H-2 | S |
| 3 | Tighten `settlements`/`expenses` update rules (creator/admin + immutable fields) | 🟠 M-2 | M |
| 4 | Make rate limiting fail-closed and/or enforce server-side | 🟠 M-1 | M |
| 5 | Remove client admin password; custom-claims only | 🟠 M-3 | S |
| 6 | Wire `grantAdmin`/`revokeAdmin` to `adminManageUser`; drop `isAdmin` field | 🟠 M-4 | S |
| 7 | Consolidate to one AI backend + one model constant | 🟠 M-5 | M |
| 8 | `npm audit fix`, bump Vite | 🟠 M-6 | S |
| 9 | Purge committed debug logs / docs; parameterise `set-admin.js` | 🟡 L-1/L-2 | S |
| 10 | Harden CSP; add anti-abuse to friend requests | 🟡 L-4/L-6 | M |

**Effort:** S ≈ <½ day, M ≈ 1–2 days.

---

## What's Already Good

- Admin authority enforced by custom claims in both rules **and** every privileged function.
- Append-only `logs`, `security_logs`, `ai_requests`; `rate_limits` not user-writable.
- Server-side validation of AI output (type coercion, enum/date regex, item filtering).
- Deliberate, well-documented UPI QR approach that avoids UPI risk-policy blocks.
- DOMPurify + Zod on user input; strong transport security headers; friend-code enumeration prevented.
- Financial arithmetic consistently rounded to 2 decimals with a dedicated, unit-tested engine.
