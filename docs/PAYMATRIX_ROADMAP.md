# paymatrix implementation roadmap

Single source of truth for future implementation sessions. Read this file first, then inspect only files relevant to the assigned session.

## Status

- Current session: Session 3 — Razorpay Web Subscriptions
- Next session: Session 4 — Admin Console
- Blockers: Firebase project is on Spark; Blaze is required for Secret Manager/Cloud Functions subscription webhook. Firestore emulator verification also requires JDK 21+ on this machine.
- External details required: Session 3 Razorpay TEST Plan IDs; later, exact Google Play product/base-plan IDs

- [x] Phases 0–3
- [x] Session 1 — Razorpay Web Proof
- [x] Session 2 — Currency + Pro Foundation
- [ ] Session 3 — Razorpay Web Subscriptions
- [ ] Session 4 — Admin Console
- [ ] Session 5 — Play Console
- [ ] Session 6 — Android Subscriptions
- [ ] Session 7 — Recurring Transactions + FX
- [ ] Session 8 — Group Invite Links
- [ ] Session 9 — Security/Pre-release

## Product and engineering rules

- Web: https://pay-matrix.vercel.app. Android: `com.paymatrix.app`, currently in closed testing.
- Brand is exactly lowercase `paymatrix`; use `logo.png`. Preserve the premium, dark, minimal, Obsidian-inspired identity across responsive web and Android.
- Store and calculate money in integer paise. Legacy money defaults to INR until currency migration is complete. Subscription billing currency is independent of expense currency.
- Preserve deterministic remainder allocation and exclude unconfirmed settlements from finalized balances.
- Optimize Firebase reads/writes without sacrificing correctness or necessary realtime behavior.
- Frontends never grant Pro. Entitlement belongs to the user account, is provider-independent, and must be established by trusted backend/provider verification.
- Provider sources may overlap: Razorpay, Google Play, admin, promo, or developer/test. One expiring source must not remove another valid entitlement.
- Never treat a Checkout/deep-link callback as proof that money moved. Verify server-side and retain user-confirmed settlement behavior.
- Never commit or document secrets. Production changes, deployments, Play releases, broad tests, and builds require explicit session authorization.
- Keep sessions within roughly 3.5–4 hours. Finish only the assigned session, update this file, then stop.

## Completed phases

- Phase 0: project audit.
- Phase 1: UI cleanup and Firebase optimization; Friends/Friend Requests and Dashboard improvements retained.
- Phase 2: Logs upgrade covering expense, income, transfer, currency-ready amounts, accounts, categories, notes, date/time, optional groups/friends/splits, details, edit/delete/duplicate, search, and filters.
- Phase 3: Accounts and Categories.

## Session 1 — Razorpay Web Proof (completed 2026-09-10)

Goal: securely prove one-time Razorpay Standard Web Checkout; it must not grant Pro.

- Implemented Vercel serverless `POST /api/create-order` and `POST /api/verify-payment`.
- Order creation requires Firebase authentication, integer amount of at least 100 paise, server credentials, and returns a short-lived server-authenticated order token.
- Verification uses the token's server-authoritative order ID plus HMAC-SHA256 and timing-safe comparison.
- Temporary ₹1 profile checkout is behind `VITE_RAZORPAY_TEST_CHECKOUT_ENABLED=true`; handles cancellation, Checkout failure, API errors, and verified success.
- Verified: exposed Test key rotated with immediate deactivation; replacement stored only in ignored local configuration; authenticated ₹1 Netbanking simulation captured; backend HMAC verified; Dashboard transaction `pay_TaIGoHxXwMyB8x` is Captured; onboarding is 3/3 complete; account activation is complete (2026-09-10); automatic capture is configured within 12 minutes.
- Capabilities: Subscriptions and Plans screens are available with zero current records; no webhooks configured; international cards require an access request; the Dashboard currently presents PayPal as the international-currency Checkout route and MoneySaver bank transfers as a separate product.
- Do not grant Pro, implement recurring subscriptions, or change Android billing in this session.

## Session 2 — Currency + Pro Foundation

Implement currency-aware users/groups/transactions with INR fallback; centralized regional subscription pricing; Free/Pro feature configuration (`hasFeature`, `getLimit`); provider-independent entitlement states (`free`, `active`, `grace_period`, `cancelled`, `expired`); 3-day grace support; Pro and Settings subscription UI; safe developer/test entitlement. Initial launch pricing: India ₹49/month or ₹299/year (show ₹99/₹399 struck through); USA $1.99/$14.99; euro markets €1.99/€14.99; UK £1.79/£12.99. Provider configuration, not editable frontend state, validates billing price/country.

Completed 2026-09-10: centralized regional pricing and feature limits; provider-independent multi-source entitlement resolution; three-day grace support; client-read/backend-write entitlement rules; Pro settings UI; explicit INR/USD/EUR/GBP group currency with legacy INR fallback. Verified with 48 tests, targeted lint, and production build.

## Session 3 — Razorpay Subscriptions Web

After Sessions 1–2, create TEST Plans (minimum INR ₹49 monthly and ₹299 yearly; manageable USD/EUR/GBP plans only if supported), implement Subscription creation/Checkout, verified idempotent webhooks, and entitlement mapping for activation, renewal, failure with 3-day grace, cancellation through paid period, and expiry. Never model recurring Pro as repeated Orders or enable live charging.

In progress 2026-09-10: created Razorpay Test plans `plan_TaIatcbuADa6uE` (₹49 monthly) and `plan_TaIbDanlqitfVO` (₹299 yearly); implemented disabled-by-default Checkout, authenticated subscription creation, signed idempotent webhook processing, and multi-provider entitlement updates. Firebase CLI secret upload was rejected because the project is not on Blaze, so webhook deployment and end-to-end subscription verification remain blocked. Do not enable `VITE_RAZORPAY_SUBSCRIPTIONS_ENABLED` before that verification.

## Session 4 — Admin Console

Build secure web-only `/admin`: resolve the authorized administrator UID/custom claim for `1080patelharshil@gmail.com`; protect privileged backend/data access; add dashboard, user/group search and details, entitlement status, separate audited admin grants (7/30 days, 1 year, lifetime, custom), revocation, aggregates, and audit log. Never rely on frontend email checks.

## Session 5 — Play Console

Inspect authenticated Play Console for `com.paymatrix.app`: exact existing subscription/base-plan IDs, regions/pricing, monetization and alternative-billing eligibility/enrollment. Stop at agreements with material legal/financial obligations. Decide between Play Billing or compliant Play Billing plus eligible Razorpay alternative billing. Do not publish.

## Session 6 — Android Subscriptions

Implement the Session 5 decision. Verify Google Play purchases through trusted backend; if alternative billing is eligible/configured, follow Google's APIs, UX, reporting, and Razorpay verification. Both web and Android purchases map to shared user entitlement and overlapping providers remain independent. No production release unless requested.

## Session 7 — Recurring Transactions + FX

Add recurring personal transactions (weekly/monthly/yearly/custom, next occurrence, active/paused, optional end) separately from Pro billing. Add FX abstraction/provider if approved, caching, rate timestamp, preserved original amount/currency, and separately displayed conversion.

## Session 8 — Group Invite Links

Implement secure invite tokens and web/app links. Installed Android opens the group/join flow; otherwise redirect to the official Play listing. Handle invalid, expired/revoked, already joined, logged-out, and deleted-group states.

## Session 9 — Security, legal, and pre-release

Review Firebase rules, entitlement/admin authorization, Razorpay webhooks, Play verification, secrets, invite abuse controls, account deletion, Privacy Policy, Terms, Subscription Terms, cancellation/refund details, and support surfaces. No production release unless explicitly requested.
