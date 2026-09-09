# paymatrix 2.3.1

Android version code: 23001. Package: `com.paymatrix.app`.

## What changed

- Added an overall-summary widget and a configurable group widget with direct Add expense and Scan bill actions.
- Added cached widget snapshots with freshness and pending-sync labels, plus account-switch isolation.
- Fixed expense edit hydration so asynchronously loaded versions, payers, and allocations are preserved before save.
- Fixed notification taps so friend events open Friends and group events open their group.
- Added cache-first PWA startup and saved-balance fallback while fresh data updates in the background.
- Made Friends, members, and group logs more concise; member taps now open useful details and friend actions.
- Standardized page typography, side padding, card spacing, light-theme actions, and the Android bottom navigation pill.

## Verification

- Android unit tests and lint passed; signed APK and signed Play AAB built successfully with JDK 21.
- Six Android instrumentation tests passed at normal and 200% text sizes during the final UI verification.
- Web: 42 tests passed, lint passed, and the production PWA build passed.
- Firestore: 23 authorization and financial-mutation rules tests passed against the emulator.
- APK metadata: version 2.3.1 (23001), min SDK 24, target SDK 36.
- APK signing certificate SHA-256 matches 2.3.0: `77bc53c8e4c6eeb17449750b0bd1d83901682030219e8a363963428e9820659f`.
- A signed 2.3.0 installation upgraded in place to 2.3.1 on the isolated emulator and cold-launched without an AndroidRuntime crash.

## Play Store

Upload `paymatrix-2.3.1.aab` to the Play Console. The AAB uses version code 23001 and the existing upload key. Keep the mapping file privately archived for crash deobfuscation.

## Boundaries

Physical-device sign-in, push reception, camera/AI scanning, multi-user financial flows, and iPhone installed-PWA startup still require real-device confirmation. Widget figures are saved snapshots refreshed by the app; they are not continuous background server reads. A UPI app return is not payment proof, and settlements remain user-confirmed.

The attached native-source ZIP is a sanitized reproducible checkpoint. It excludes Firebase configuration, SDK paths, signing material, caches, and generated outputs.
