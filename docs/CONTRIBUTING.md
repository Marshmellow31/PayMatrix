# Contributing to PayMatrix

## Development setup

```bash
# Frontend
cd frontend
npm install
npm run dev          # Vite dev server on :5145

# Cloud Functions (optional — only needed if changing functions/index.js)
cd functions
npm install
firebase emulators:start --only functions
```

## Before opening a PR

Run all checks locally:

```bash
cd frontend
npm run lint          # ESLint — zero warnings policy
npm run format:check  # Prettier
npm test              # Vitest unit tests
npm run build         # Vite bundle validation
```

All four must pass. CI runs the same checks on every push.

## Code conventions

### Financial writes
- Every Firestore write that records money (expense, settlement) must use `await withRetry(...)`.
- Pre-generate doc IDs with `doc(collection(...))` before the write so retries are idempotent.
- Use `round2(x)` from `balanceEngine.js` for all currency arithmetic.

### Cross-user notifications
Use `createNotification()` from `notificationHelper.js`. It creates deterministic IDs and fixed copy; Firestore rules verify the matching friend request or group ledger record. Do not write arbitrary cross-user notification documents or user-controlled notification text.

### Logging
Use `logger(moduleName)` from `src/utils/logger.js`. Do not use `console.log` directly — it is silenced in production but still produces lint warnings.

```js
import logger from '../utils/logger';
const log = logger('myService');
log.info('doSomething', { context });
log.error('doSomething', err);
```

### Caches and PII
- Do not persist user names, emails, or avatars to `localStorage` or `sessionStorage`.
- If you add a new in-memory cache of user data, export a `clearXxxCache()` function and call it from `authSlice.js` `logout` reducer.

### Admin checks
- Never hardcode a UID as a bypass for admin checks.
- Use `request.auth.token.admin === true` in Cloud Functions and `getIdTokenResult(true).claims.admin === true` on the client.

## Adding a new Cloud Function

1. Add the export to `functions/index.js`.
2. Start with the auth guard:
   ```js
   if (!request.auth) throw new HttpsError("unauthenticated", "...");
   ```
3. If the function is admin-only, add:
   ```js
   if (!request.auth.token.admin) throw new HttpsError("permission-denied", "...");
   ```
4. Run `node --check functions/index.js` to verify syntax.
5. Document the new function in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Adding a new Firestore collection

1. Add rules in `firestore.rules` (follow the existing pattern: explicit allow/deny per operation).
2. Ensure cross-user writes go through a Cloud Function — the client should only write docs where `to == auth.uid` or similar.
3. Document the collection in [ARCHITECTURE.md](./ARCHITECTURE.md).
4. Add the collection to the security table in [SECURITY.md](./SECURITY.md).

## Testing

Unit tests live alongside source files as `*.test.js`. Run them with:

```bash
npm test            # single run
npm run test:watch  # watch mode
```

Add tests for:
- Any new business logic in `src/utils/`
- Any new validation rules in `src/services/validationService.js`
- Any new balance / split calculation changes in `balanceEngine.js`

Financial logic changes **must** include tests.
