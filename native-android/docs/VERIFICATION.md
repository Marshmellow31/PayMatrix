# Verification record

## Artifact

- Package: `com.paymatrix.app`
- Version: `2.0.0-native-preview` (`10300`)
- Minimum Android: API 24
- Target Android: API 36
- SHA-256: `15ddeddf1873cfb220e50d0d3f824db5cd2e86d741255b69dd7f7d8bc67fdf84`
- Release signer SHA-256: `77bc53c8e4c6eeb17449750b0bd1d83901682030219e8a363963428e9820659f`

The signing identity matches the existing `releases/paymatrix-1.2.5.apk`, so Android accepts this native build as an update to that signed release.

## Automated checks completed

- `lintDebug`
- `testDebugUnitTest` (5 financial-domain tests)
- `assembleDebug`
- `assembleRelease` with R8 and resource shrinking
- Firestore authorization tests against the Firebase emulator (16/16)
- APK package, SDK, version, permissions, certificate, and checksum inspection

## Emulator checks completed

- Installed the existing signed v1.2.5 APK.
- Updated it in place to native version code 10300.
- Launched `MainActivity` without an Android runtime crash.
- Visually checked the native login screen, safe-area layout, branding, and dark theme.
- Opened the native Credential Manager Google sign-in flow without a crash.

## Still requires a physical device/account

- Complete Google sign-in and authenticated Firestore workflows.
- Camera capture and bill-scanner upload.
- UPI app launch and explicit user-confirmed settlement recording.
- Push notification delivery.
- Refresh-rate and startup/frame-time profiling on representative hardware.
- Bank/UPI history confirmation; an Android intent result never proves that money moved.

No Firebase rules were changed or deployed. Firebase CLI was used to register the native debug app, add signing fingerprints, download configuration, and run rule tests.
