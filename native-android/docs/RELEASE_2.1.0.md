# paymatrix Android 2.1.0 release record

## Scope

Version 2.1.0 is the Google Play release candidate. It keeps package `com.paymatrix.app`, Firebase project compatibility, and the established signing identity while raising `versionCode` to `21000`.

### Product changes

- Rebuilt Home around actionable balances, pending settle-ups, active groups, month-over-month spend, top category, and recent activity.
- Aligned the login, groups, friends, activity, spending logs, and profile screens to the web product's Digital Obsidian visual system.
- Added restrained press motion, clearer hierarchy, consistent spacing, human-readable labels, and destructive-action confirmations.
- Restored the canonical lowercase `paymatrix` identity and `logo.png` launcher assets.

### Reliability and integrity

- Expense and spending-log mutations can queue safely through Firestore's durable local cache when offline. Settlement confirmation remains online-only so the app does not imply that money moved without fresh server state.
- Added visible pending-sync and offline states.
- Fixed spending-log deletion history: entry add/edit/delete and imported-expense actions now create immutable activity records atomically.
- Spending-log groups are soft-deleted so Firestore subcollections and export history are not orphaned.
- Dashboard reads no longer hydrate every group profile/log document; summary queries are bounded to financial data and activity feeds are capped.
- Added Crashlytics, Performance Monitoring, and App Check providers. Do not enable App Check enforcement until Play Integrity and both signing certificates are registered and metrics are healthy.

## Verification completed on 1 September 2026

- Firestore authorization emulator suite: 21 passed, 0 failed, including atomic spending-log add/delete activity and forged-event rejection.
- Web: ESLint passed, 26 unit tests passed, release-touched files formatted, and the production PWA bundle built.
- Android: unit tests, debug compilation, release lint, R8/resource shrinking, signed APK, and signed AAB all passed.
- APK identity: `com.paymatrix.app`, version `2.1.0` (`21000`), min SDK 24, target SDK 36.
- Signing continuity: certificate SHA-256 `77bc53c8e4c6eeb17449750b0bd1d83901682030219e8a363963428e9820659f`, matching 2.0.2.
- APK alignment: 16 KiB page alignment verification passed.
- APK SHA-256: `c50cb13909469406d9068b236cc2b269bcbacbb15c8e01385c00003e6a3c0317`.
- AAB SHA-256: `f6f95742e80f22dd24a7d4d916e57f83e760defc7a56b89b8d80fe858b04e665`; JAR signature verification passed.
- Emulator upgrade: `adb install -r` succeeded from 2.0.2 to 2.1.0 while preserving the original install time; cold launch had no fatal Android runtime log.
- Visual/device checks: login screen inspected at normal and 130% text size; Google credential handoff opened successfully.

Crashlytics mapping generation succeeded, but automatic upload to Google's Crashlytics endpoint was retried twice and reset by the local network. Preserve `app/build/outputs/mapping/release/mapping.txt` and upload it when the connection permits so minified production stack traces are deobfuscated.

## External publication gates

The build alone cannot complete Play publication. The developer must finish the Play Console declarations, confirm the developer account/testing requirement, register Play App Signing certificates for Firebase/Auth/App Check, add reviewer access, upload screenshots, run internal testing, and inspect the pre-launch report. Physical-device Google sign-in, camera, notifications, UPI handoff, TalkBack, large text, and high-refresh behavior must still be checked before production rollout.

See `play-store/RELEASE_GATES.md` for the exact checklist and `docs/SCALING_AND_OFFLINE.md` for supported offline boundaries.
