# PayMatrix P1 Production Readiness

Updated: 2026-08-23

## Product decisions

- `logo.png` is the only product logo and is used for web, launcher, adaptive icon, notification imagery, and splash assets. The old brand mark was removed.
- The Google Pay direct-launch experiment is removed. PayMatrix displays recipient details, a UPI QR and copy actions, but does not claim that money moved.
- Settlement confirmation is payer-only. A confirmed PayMatrix record is the payer's ledger declaration, not bank verification.
- Every current group member may edit an expense. The payer and creator identities remain immutable; every create, edit, delete, restore, and settlement change is atomically audited.
- Every group member may read every other member's safe public name/photo card even when they are not friends. Email, UPI ID, friend list and other private profile data remain protected.
- Account deletion immediately removes identifying profile fields and displays `Deleted user` in shared history. A PII-free completion receipt has a 30-day retention target. The real name is not retained because that would not be anonymization.
- Firebase Spark remains the current operating plan. Features that require trusted scheduled or push infrastructure are not represented as live when no function is deployed.
- P2 features are deferred. P1 trust, ledger correctness, privacy, offline behavior and Android release quality take priority.

## Completed implementation

- Integer-paise balance engine and deterministic rounding tests for all split modes.
- Idempotent payer-confirmed settlements with stable operation IDs.
- Atomic immutable audit events for financial mutations.
- Collaborative expense editing with server-enforced identity invariants and stale-version conflict rejection.
- Hardened user, group, invite, friend-request, notification, admin-log and AI-record Firestore authorization.
- Ten Firestore emulator authorization tests.
- AI scan authentication, MIME/image limits, four-image cap, timeouts and a ten-scans-per-hour atomic quota.
- Firestore persistent offline cache, pending-sync indicator, automatic reconnect sync and account-isolated logout cleanup.
- Minimal public member profiles for group name/photo visibility.
- Explicit notification opt-in instead of first-launch prompting.
- Public `/privacy` and `/delete-account` routes, data export, reauthentication and anonymizing account deletion.
- Removed wildcard icon imports; deferred PDF/chart loading; reduced web precache from about 4.8 MiB to about 3.0 MiB.
- Frontend runtime dependencies have zero known npm-audit vulnerabilities. Android's local-only
  `@capacitor/assets` image-generation tool still inherits published `sharp`, `tar`, and `uuid`
  advisories with no non-breaking upstream resolution; those packages are not bundled in the APK.
- Real logo regenerated across Android densities.
- Debug APK and signed/minified release AAB builds verified.
- Play upload keystore generated outside the repository with an ignored signing configuration and separate recovery record.

## Live Firebase state

The tested Firestore rules were deployed to project `paymatrix-174b5` on 2026-08-23. No Cloud Functions are deployed in that project.

## Release gates still requiring external setup or human validation

- Install the release on at least two physical Android devices and run the full two-user workflow, including offline conflicts, account deletion, Google reauthentication and process death.
- Configure Play Console, enable Play App Signing, upload the AAB to internal/closed testing, complete Data Safety/content declarations, and provide screenshots/feature graphic/support contact.
- Publish the current web build so `/privacy` and `/delete-account` have stable public HTTPS URLs.
- Firebase Spark cannot deploy the repository's trusted Cloud Functions. Cross-user push notifications, server-authoritative security telemetry, scheduled reminders and automated cleanup cannot be called production-ready on the current plan. In-app Firestore updates still work.
- Configure Firebase App Check before exposing paid AI scanning broadly. Rate limiting is present, but App Check adds device/app attestation.
- Perform a live-data compatibility/migration review for legacy friend-request IDs and older financial documents before inviting existing users to edit them.

## Verification commands

From `frontend`:

```text
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd audit --audit-level=moderate
```

From the repository root with Java 21:

```text
firebase.cmd emulators:exec --only firestore --project demo-paymatrix "npm.cmd --prefix frontend run test:rules"
```

From `android app`:

```text
npm.cmd run doctor
npm.cmd run android:apk
npm.cmd run android:aab
```
