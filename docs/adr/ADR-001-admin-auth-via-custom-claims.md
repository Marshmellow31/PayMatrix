# ADR-001: Admin Authentication via Firebase Custom Claims

**Date:** 2026-06-26  
**Status:** Accepted

## Context

The original admin system used two layered bypasses:

1. `sessionStorage.getItem('admin_authenticated') === 'true'` — trivially bypassable via DevTools in < 5 seconds
2. A hardcoded UID fallback (`eidrZjV5Nwcq6iY5Gp51L4KZLHs2`) in both `firestore.rules` and `functions/index.js` — grants permanent admin to a single account regardless of intent

Both bypasses mean any user with Chrome DevTools could elevate to admin without credentials.

## Decision

Replace both bypasses with Firebase Custom Claims as the single source of truth for admin status:

- Firestore rules: `request.auth.token.admin == true` (no UID fallback)
- Cloud Functions: `request.auth.token.admin === true` (no UID fallback)
- Client `AdminRoute`: `getIdTokenResult(true).claims.admin === true` checked asynchronously
- Client state: admin status held in React component state only — never `sessionStorage` or `localStorage`

A password form backed by `VITE_ADMIN_PASSWORD` is kept as an in-memory-only bootstrap mechanism for the first time an admin needs to grant themselves Custom Claims.

## Bootstrap Procedure

1. Navigate to `/admin` → enter `VITE_ADMIN_PASSWORD` (in-memory grant, current session only)
2. Go to Admin Panel → Users → find your account → Grant Admin Claims
3. Sign out and sign back in (Firebase ID token must be refreshed to carry the new claim)
4. Subsequent sessions: Custom Claims checked automatically — no password form shown

## Consequences

**Positive:**
- Admin status cannot be spoofed via DevTools
- Firestore rules and Cloud Functions share the same enforcement mechanism
- Audit trail: `adminManageUser` logs every grant/revoke to the server console

**Negative:**
- New admins require a bootstrap step (password form → grant claim → re-login)
- If the password is lost before any admin has Custom Claims, the Firebase Console must be used to set claims directly via the Admin SDK

**Neutral:**
- `VITE_ADMIN_PASSWORD` remains in `.env` and is still required for bootstrapping; it should be rotated after claims are set on all intended admins
