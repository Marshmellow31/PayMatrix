# paymatrix web billing: testing and release

## Implemented flow

Profile → paymatrix Pro → Monthly (₹49) or Yearly (₹299) → Razorpay Checkout → server signature verification → server-owned Pro entitlement. Authorizing a mandate alone does not activate Pro. A Razorpay active billing period must exist. Refresh billing reconciles the current provider state if checkout verification or webhook delivery was delayed.

Cancellation requires confirmation in Profile. Active subscriptions cancel future renewals at period end; unstarted mandates cancel immediately. Cancellation does not issue a refund. Provider cancellation behavior: https://razorpay.com/docs/api/payments/subscriptions/cancel-subscription/

The existing one-rupee proof card has been removed from Profile. Its diagnostic API endpoints remain disabled by default and never grant Pro. The local API runner now invokes the deployment handlers instead of maintaining separate receipt-scanning logic.

## Configuration

Use Node 24 for deployment, matching the existing Vercel project and local verification runtime. Firebase Admin 14 requires Node 22 or newer: https://github.com/firebase/firebase-admin-node/releases/tag/v14.0.0

For local testing put server values in `frontend/.env.local` (Git-ignored). For Vercel set them in the intended Preview environment first. Never put secrets in variables starting with `VITE_`.

| Variable | Value |
| --- | --- |
| `VITE_RAZORPAY_SUBSCRIPTIONS_ENABLED` | `true` |
| `RAZORPAY_SUBSCRIPTIONS_ENABLED` | `true` |
| `VITE_RAZORPAY_TEST_CHECKOUT_ENABLED` | `false` |
| `RAZORPAY_TEST_CHECKOUT_ENABLED` | `false` |
| `RAZORPAY_KEY_ID` | Razorpay **Test Mode** key |
| `RAZORPAY_KEY_SECRET` | Matching server secret |
| `RAZORPAY_PLAN_MONTHLY_INR` | Monthly INR plan, 4900 paise, interval 1 |
| `RAZORPAY_PLAN_YEARLY_INR` | Yearly INR plan, 29900 paise, interval 1 |
| `RAZORPAY_WEBHOOK_SECRET` | Secret matching the webhook configured below |
| `FIREBASE_ADMIN_PROJECT_ID` | Same Firebase project as the browser app |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Admin service-account email |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Service-account private key; escaped newlines are supported |

Keep the existing `VITE_FIREBASE_*` configuration. Real bill scanning also requires server-only `GEMINI_API_KEY`.

Inspection on 2026-09-11 confirmed that the Vercel `pay-matrix` Production environment already contains the Razorpay and Firebase Admin secret names above. It has no subscription-enable flags and exposes only the old `VITE_GEMINI_API_KEY` name for scanning. Set the two subscription flags explicitly and provision a rotated server-only `GEMINI_API_KEY`; remove the public Gemini variable. Protected production secrets cannot be downloaded using `vercel env pull`, so local/Preview testing needs separately provisioned credentials. Secret-name presence does not verify that the credential values are valid or whether production keys are Test or Live Mode.

In Razorpay **Test Mode → Settings → Webhooks**, configure `https://YOUR-PREVIEW-HOST/api/razorpay-subscription-webhook`. Select subscription lifecycle events, including authenticated, activated, charged, pending, halted, paused, resumed, cancelled and completed where available. Use the exact matching webhook secret. Ensure the webhook URL is reachable by Razorpay and is not behind Vercel preview-login protection. Point one webhook at this web API; do not also deliver the same events through the legacy billing-gateway project.

The API rejects missing configuration, unapproved plans, mismatched prices, forged signatures and cross-account subscriptions. It stores checkout ownership in server-only `billingAccounts/{uid}` and entitlements in `entitlements/{uid}`. Existing Firestore default-deny rules keep both inaccessible to client writes; no new rules deployment is required for these billing endpoints.

## Run locally

Open two terminals in `frontend/`:

```powershell
# Terminal 1
npm.cmd run dev:api
```

```powershell
# Terminal 2
npm.cmd run dev
```

Open the URL printed by Vite. Sign in with Google or a verified email/password account. Open **Profile → paymatrix Pro**. Localhost checkout verification can update entitlement directly; recurring webhook delivery must be exercised on a reachable preview host.

## Acceptance test

1. Choose Monthly. Confirm Razorpay shows ₹49 and a recurring mandate before using its documented Test Mode payment method. No real payment should be made in this pass.
2. Confirm the UI displays verification or pending activation until the provider is active. It must not announce Pro solely because a mandate was authenticated.
3. Click **Refresh billing**. Once Razorpay reports an active paid period, confirm **Pro active**, the subscription reference, and the period-end date. Reload and confirm status persists.
4. Close an unfinished checkout. Refresh billing and choose **Resume checkout**. Confirm the existing subscription ID is reused.
5. Exercise a failed payment and refresh status before retrying. Confirm a failure never grants Pro.
6. Open two tabs and attempt checkout. Confirm only one subscription is created for the account. An in-progress request must block duplicates.
7. Choose **Cancel subscription → Keep subscription**, then repeat and choose **Confirm cancellation**. Confirm cancellation is acknowledged and paid access remains until the period ends. Unstarted authorizations should cancel immediately.
8. Redeliver a subscription webhook in Razorpay. Expect HTTP 200 and one `billingEvents` record for that event. Confirm delayed older events do not replace newer stored state.
9. Sign out and use another account. Confirm it cannot view, verify or cancel the first account's subscription.
10. Verify login, group/expense creation, deterministic balances, user-confirmed settlements, bill scanning, exports and offline display with isolated test data before release.

## Automated checks

Verified locally on 2026-09-11: 154 unit/API tests, 29 Firestore emulator authorization tests, and 6 browser checks passed. Lint, formatting, the repository release check and the production/PWA build passed. Razorpay's read-only API confirmed the local Test Mode plan prices and intervals. No payment was submitted, no production deployment was made, and hosted webhook delivery remains unverified. `npm audit` reports two remaining moderate advisories through the optional Storage SDK's `gaxios`/`uuid` dependency chain; no high or critical findings remain in the frontend dependency audit.

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd run format:check
npm.cmd run release:check
npm.cmd test
npm.cmd run test:billing-ui
npm.cmd run build
npm.cmd audit
```

Browser tests use installed Chrome and mocked billing responses. They test the real component at desktop and phone viewports, not Razorpay's hosted checkout or a real Firebase write. Test fixtures are excluded from Vercel upload and the production build entrypoints.

`release:check:env` reads the process environment; export the intended deployment variables before running it. It checks matching browser/server subscription flags and required secrets when billing is enabled. A passing static check does not prove provider connectivity.

## Recovery and release boundaries

If creation times out after reaching Razorpay, the server keeps `billingAccounts/{uid}.creating` locked to prevent duplicate mandates. An operator must locate the subscription in Razorpay by the paymatrix UID/product notes. If exactly one matching subscription exists, set that account's `subscriptionId` to its ID and `creating` to false through a trusted Admin tool; then refresh billing. If provider support confirms none was created, clear the lock. Never clear it merely because the browser timed out.

For users who subscribed with the earlier implementation, link their verified Razorpay subscription ID to `billingAccounts/{uid}` before enabling self-service management. Do not create another subscription for migration.

Before accepting live money, verify account activation, matching Live Mode keys and Live Mode plans, webhook delivery, private billing support, refund handling, and merchant disclosures. The current repository values verified during implementation are **Test Mode**. Do not switch to Live Mode merely because mocked browser tests pass. Keep secrets from any prior exposure rotated before release.

Record the deployed commit and previous Vercel deployment before release. Roll back web/API assets on authentication failures, incorrect entitlement grants, duplicate mandates or persistent billing errors. Set `RAZORPAY_CHECKOUT_PAUSED=true` and redeploy to pause new purchases while keeping verification, cancellations and webhook reconciliation available. Keep `RAZORPAY_SUBSCRIPTIONS_ENABLED=true` for existing billing operations.
