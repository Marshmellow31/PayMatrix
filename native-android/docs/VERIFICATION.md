# Native 2.0.0 beta verification record

Verified on 2026-08-27.

## Artifact

- File: `releases/paymatrix-native-2.0.0-beta.apk`
- App label: `paymatrix beta`
- Package: `com.paymatrix.app.native.beta`
- Version: `2.0.0-beta` (`20000`)
- Minimum Android: API 24
- Target Android: API 36
- Size: 4,291,038 bytes
- SHA-256: `ef3ac44cc375204ad51693b06cac54ffd2507908d1ef24ea6954aa9dcd7169fd`
- Release signer SHA-256: `77bc53c8e4c6eeb17449750b0bd1d83901682030219e8a363963428e9820659f`

The beta intentionally has a different package from the Capacitor app. It cannot overwrite `com.paymatrix.app`.

## Automated checks completed

- Kotlin release and debug compilation
- `testDebugUnitTest` (8/8 financial-domain tests)
- `lintDebug`
- `assembleRelease` with R8, resource shrinking, and a bundled baseline profile
- Firestore authorization suite against the Firebase emulator (16/16)
- APK package, SDK, label, version, certificate, and checksum inspection
- `git diff --check`

## Emulator checks completed

- Installed actual Capacitor `1.2.5` (`com.paymatrix.app`, version code `10205`).
- Installed native `2.0.0-beta` (`com.paymatrix.app.native.beta`, version code `20000`) beside it.
- Launched both activities independently without an Android runtime crash.
- Visually checked native login safe areas, the BETA marker, branding, and dark theme at 1080 x 2400.
- Opened the native Credential Manager Google flow; the test emulator has no signed-in Google account, so authenticated pages remain a physical-account smoke-test gate.

## Physical-device beta checklist

- Complete Google sign-in and confirm existing Firestore data appears.
- Confirm Google avatars for the owner, friends, requests, group members, split picker, settlements, and profile. The client checks both legacy `avatar` and Google `photoURL`, with disk/memory caching and initials fallback.
- Exercise create/edit/delete/restore for groups, expenses, settlements, friends, logs, notifications, profile export, and account deletion.
- Verify camera capture, gallery selection, and bill-scanner upload.
- Verify UPI app launch, bank history, and explicit user-confirmed settlement recording.
- Verify FCM delivery and offline-to-online synchronization.
- Profile startup and scrolling on representative 60/90/120 Hz phones.

No Firebase rules or backend data were changed. Firebase CLI registered the dedicated beta app and its release/debug signing fingerprints. Publishing this GitHub prerelease does not retire or modify the existing Capacitor release.
