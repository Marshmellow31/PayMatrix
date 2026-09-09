# PayMatrix — Workspace Guidelines & Rules

## 1. Product Invariants
- **Branding**: Exact lowercase `paymatrix`, `logo.png`, application package `com.paymatrix.app`.
- **Financial Arithmetic**: All financial values are stored and calculated in integer paise (`amountPaise`). Decimal rupee values are strictly for UI formatting.
- **Remainder Conservation**: Remainder paise during splits or allocations are distributed deterministically across participants.
- **Settlement Parity**: Unconfirmed settlements are excluded from finalized debt and balance calculations.

## 2. Multi-Payer Data & Firestore Security Rules
- **Multi-Payer Schema**: Expenses support multiple payers via the `payers` array containing objects with `user`, `amount`, `amountPaise`, and optional `percent`.
- **Security Rule Invariants**:
  - In `firestore.rules` under `match /expenses/{expenseId}`, both `create` and `update` allow writes if either `paidBy` is in group members OR the primary item `payers[0].user` is in group members:
    ```firestore-security-rules
    (request.resource.data.get('paidBy', '') in groupData(groupId).get('members', []) ||
     (request.resource.data.get('payers', []).size() > 0 &&
      request.resource.data.get('payers', [])[0].get('user', '') in groupData(groupId).get('members', [])))
    ```
  - `splitUserIds` validation must always fall back to `participants`:
    ```firestore-security-rules
    request.resource.data.get('splitUserIds', request.resource.data.get('participants', [])).hasOnly(groupData(groupId).get('members', []))
    ```
  - Document versions must increment strictly by 1 on update:
    ```firestore-security-rules
    request.resource.data.get('version', 0) == resource.data.get('version', 1) + 1
    ```
  - All financial mutations must atomically write an audit record to `/groups/{groupId}/logs/{logId}` matching `lastMutationId`, `lastMutationType`, and `lastEditedBy`.

## 3. Jetpack Compose Async State Hydration
- **Edit Screen State Hydration**: Never allow edit forms (such as `ExpenseFormScreen`) to permanently capture initial empty or fallback states (`remember(expenseId) { editing?.version ?: 1L }`).
- **Reactive Synchronization**: When an existing record loads asynchronously from the repository or group cache, update `initialVersion`, multi-payer selections (`selectedPayers`, `payerDivisionMode`, `payerValues`), and split distributions reactively (e.g. using `LaunchedEffect(editing)`) so mutations do not submit stale version numbers or overwrite payer data.

## 4. Tooling & Execution
- Use `npm.cmd` on Windows when PowerShell execution policy blocks standard npm scripts.
- Run web tests from `frontend/` using `npm.cmd test`.
- Deploy Firestore security rules using `npx firebase deploy --only firestore:rules`.

## 5. Offline Caching, Display Reads & Session Isolation
- **Display Reads vs. Mutation Invariant**: `getDisplayDocs` uses bounded network wait with cached fallback strictly for UI rendering. Never use cached reads to authorize or compute mutations. An empty cache (`cached.empty`) must never be interpreted as a zero balance.
- **Account Switch Isolation**: When `auth/setUser` receives a different user ID (`previousUid !== nextUid`), the Redux `rootReducer` must reset the entire store state (`appReducer(undefined, action)`) to prevent cross-account data leaks.
- **Notification Destination Security**: All notification links (toasts, PWA push clicks, in-app feed, Android launcher intents) must be validated via `notificationDestination()`. Enforce origin allowlisting, reject external/protocol-relative URLs, and encode route parameters.
- **PWA Shell Caching**: The service worker must serve `offlineSpaHandler` directly for `NavigationRoute` (excluding `/api/`, `/__/`, and `/.well-known/`) to eliminate network latency stalls and asset mismatch.

