# PayMatrix Android Implementation Status

## Status snapshot

Updated August 4, 2026. The separate Android workspace is implemented and produces an installable
debug APK plus a minified release AAB. The web/PWA package remains independently buildable. This file
records what is complete, what was changed externally, and what still requires owner credentials or a
physical device.

## Locked technical identity

| Field | Value |
| --- | --- |
| Android package and Gradle namespace | `com.paymatrix.app` |
| App name | `PayMatrix` |
| Version | `1.2.0` |
| Version code | `10200` |
| Minimum SDK | API 24 |
| Compile and target SDK | API 36 |
| Firebase project | `paymatrix-174b5` / project number `344969363066` |
| Firebase Android app ID | `1:344969363066:android:f200bee5cbcf086a3305c3` |

The owner must confirm `com.paymatrix.app` before creating the Play listing. Code, Firebase, and build
artifacts currently use this exact ID.

## Build artifacts

| Artifact | State | Size | SHA-256 |
| --- | --- | ---: | --- |
| `android/app/build/outputs/apk/debug/app-debug.apk` | Installable, debug signed | 10,336,732 bytes | `64CF858B840AB07B205F332BE65A8BAD39F65C432587DC96E8A804462A6E005F` |
| `android/app/build/outputs/bundle/release/app-release.aab` | Minified release build, unsigned | 5,744,028 bytes | `2092C15F91304391D603FE7A021A322B58BCD9039DFC02D63A0C9440C8470BF0` |

The unsigned AAB proves release compilation, resource shrinking, R8, and release lint pass. It cannot
be uploaded to Play until an upload keystore is configured in ignored `android/key.properties`.

## Implemented Android behavior

- Separate Capacitor 8 package, dependency lock, Gradle wrapper, local assets, build scripts, icons,
  splash assets, and ignored release/Firebase credentials under `android app/`.
- Dedicated Android login screen. It invokes Android Credential Manager through native Firebase
  Authentication and then exchanges the Google credential into the existing Firebase JS Auth session.
- The web login still uses `signInWithPopup`; Android does not open that browser popup.
- System and predictive Back use a central priority stack: an open modal closes first, route history
  navigates next, and Back at the app root backgrounds the task.
- Edge-to-edge safe areas, gesture-navigation inset handling, keyboard handling, native status bar,
  haptics, splash lifecycle, deep-link routing, and notification-action routing.
- API 35+ requests Android's high frame-rate category. UI routes are lazy loaded, Android strips PWA
  registration and remote font links, and expensive native-runtime blur/motion is reduced.
- Native Firebase Messaging permission/token/listener support and an Android notification channel.
- Per-installation Firestore push-token documents let web, Android, and multiple phones coexist.
- Android bill scanning targets `https://pay-matrix.vercel.app/api/scan-bill`, sends a Firebase ID token,
  and the server handler now validates identity, CORS origin, MIME type, image count, and payload size.
- Release hardening includes no cleartext traffic, system-only TLS trust, backups disabled, release
  WebView debugging disabled, resource shrinking, and R8 minification.

## Firebase work completed

The following external changes are already complete:

1. Registered Firebase Android app `PayMatrix Android` with package `com.paymatrix.app`.
2. Added debug SHA-1
   `9F:3F:F1:54:81:B0:69:A1:C4:F2:DD:A3:74:4B:7F:6E:11:65:33:35`.
3. Added debug SHA-256
   `E4:10:14:9C:68:27:D1:0B:47:5D:F7:61:9D:CE:60:9B:47:FD:AD:09:0C:D7:CE:12:CA:5B:CC:C3:FD:A2:A2:5C`.
4. Downloaded the matching ignored `android/app/google-services.json`; it contains Android and web
   OAuth clients required by Credential Manager.
5. Compiled and deployed the additive Firestore rules for `users/{uid}/pushTokens/{installationId}`.

No expense, group, settlement, profile, or authentication data migration was required. Android signs
into the same Firebase account and therefore keeps the same UID and existing Firestore permissions.

## Backend deployment gate

`functions/index.js` is updated and syntax-validated to read both the legacy `users/{uid}.fcmToken`
and new per-installation token documents, multicast to all devices, use the Android notification
channel, and remove invalid tokens. Deployment was attempted and Firebase refused it because project
`paymatrix-174b5` is on the Spark plan. Cloud Build and Artifact Registry require Blaze.

After the owner enables Blaze, run from the repository root:

```powershell
firebase deploy --only functions --project paymatrix-174b5 --non-interactive
```

Until that succeeds, Android push delivery is not an accepted production feature even though token
registration and client handling are implemented. Firestore token rules are already live.

The authenticated/CORS-enabled `frontend/api/scan-bill.js` must also be deployed through the existing
Vercel project before Android bill scanning is accepted. This workspace has no linked Vercel CLI
session, so no production Vercel deployment was performed in this run.

## Verification evidence

- `npm run lint` in `frontend`: passed with zero warnings or errors.
- `npm run test -- --run` in `frontend`: 22/22 tests passed.
- Normal `npm run build` in `frontend`: passed and generated `dist/sw.js` for the PWA.
- Android-mode Vite build and artifact validator: passed; no service worker or development URL.
- `:app:testDebugUnitTest`: passed.
- `:app:lintDebug`: passed.
- `:app:connectedDebugAndroidTest` on API 36 emulator: passed.
- Debug APK: installed and cold-launched without a crash on `Medium_Phone_API_36.0`.
- Root Back key/gesture path: moved focus from `MainActivity` to Android Launcher as designed.
- Native Firebase initialized successfully. Credential Manager was invoked; the headless emulator has
  no Google account, so successful account selection must be completed on a signed-in phone.
- `:app:bundleRelease`: passed including R8 and release lint.
- `npm audit --omit=dev`: zero production vulnerabilities. Audit findings are confined to local
  Capacitor CLI/assets development tooling and are not packaged in the APK/AAB.

Vite reports large lazy chunks for chart/PDF features. They are not loaded on the login/startup route,
but authenticated performance still needs measurement on representative physical 60 Hz and 90/120 Hz
phones. A headless software-rendered emulator is not valid proof of smooth physical-device frames.

## Reproducible commands

From `android app/`:

```powershell
npm ci
npm run doctor
npm run android:apk
node scripts/gradle.mjs :app:testDebugUnitTest :app:lintDebug :app:connectedDebugAndroidTest
```

After creating `android/key.properties` from `key.properties.example`:

```powershell
npm run android:aab
```

From `frontend/`, independently:

```powershell
npm ci
npm run lint
npm run test -- --run
npm run build
```

## Owner inputs still required

1. Confirm the permanent Play package ID is `com.paymatrix.app`.
2. Create or authorize creation of the Play upload keystore and choose its passwords. Store the key
   and password in an encrypted backup; never commit either.
3. Upgrade Firebase project `paymatrix-174b5` to Blaze, then deploy the prepared functions.
4. Deploy the updated Vercel scan endpoint and confirm its Firebase API-key environment variable.
5. Supply Play Console access plus public privacy-policy, support, and account-deletion URLs.
6. Test Google chooser, authenticated routes, notifications, bill scanner, three-button navigation,
   predictive Back, and high-refresh scrolling on at least one signed-in physical phone.
7. After Play App Signing is enabled, add both upload and Play signing SHA-1/SHA-256 fingerprints to
   the Firebase Android app and download an updated `google-services.json` if Firebase requests it.

The package/signing choices, billing upgrade, hosting deployment, and store metadata require owner
account access or a product/security decision. The corresponding technical code is prepared here.
