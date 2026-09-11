# paymatrix web production runbook

This runbook covers the free web release. For the implemented Razorpay subscription flow, required billing environment, and acceptance tests, use [WEB_BILLING_TEST_GUIDE.md](WEB_BILLING_TEST_GUIDE.md). A paid release follows that guide instead of the disabled-subscription settings below.

## Required release state

- `VITE_RAZORPAY_SUBSCRIPTIONS_ENABLED=false`
- `RAZORPAY_SUBSCRIPTIONS_ENABLED=false`
- `VITE_RAZORPAY_TEST_CHECKOUT_ENABLED=false`
- `RAZORPAY_TEST_CHECKOUT_ENABLED=false`
- Firebase, Firebase Admin, Gemini, authorized domains, and the verified-email redirect are configured in the production environment.
- APK 2.3.1 contract tests pass before any Firestore rules change.

## Local release gates

Run from `frontend/`:

```powershell
npm.cmd ci
npm.cmd run release:check
npm.cmd run lint
npm.cmd run format:check
npm.cmd test
npm.cmd run build
npx.cmd firebase emulators:exec --only firestore --project demo-paymatrix "npm.cmd run test:rules"
```

To validate a populated production environment without deploying:

```powershell
npm.cmd run release:check:env
```

## Ordered deployment when explicitly approved

1. Export the current Firestore rules and record the current Vercel deployment as rollback targets.
2. Deploy the server APIs with both Razorpay server kill switches disabled.
3. Smoke-test authenticated Pro status and receipt scanning against isolated test data.
4. Run APK 2.3.1 login, group, expense, settlement, and invite compatibility checks.
5. Deploy indexes and Firestore rules only after the compatibility checks pass.
6. Deploy the web assets, then test login, joining, expense mutation, balances, settlements, export, deletion, offline reload, and service-worker update.
7. Observe authentication failures, API 5xx responses, Firestore usage, and failed mutations before increasing traffic.

## Rollback triggers

- Any authenticated user can read or mutate another user's data.
- A financial mutation loses integer-paise conservation, deterministic remainders, or its atomic audit log.
- APK 2.3.1 cannot complete a previously supported core journey.
- Login, group loading, expense creation, settlement confirmation, or account deletion fails in production.
- API 5xx rate exceeds 2% for five minutes or Firestore usage rises unexpectedly after release.

Rollback web and API deployments first. Restore the captured Firestore rules only if the rules deployment caused the regression and the previous rules do not reopen a known security issue.
