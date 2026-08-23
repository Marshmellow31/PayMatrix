# Native Authentication and Firebase

## Document status

This document is the implementation contract for Android authentication in PayMatrix. It is documentation only. No application code, package file, Firebase project, or security rule has been changed by this document.

Target Android package: `com.paymatrix.app`

Firebase project: `paymatrix-174b5`

Production web origin: `https://pay-matrix.vercel.app`

## Goal

The Android app must open Android's native Google account chooser, show the Google accounts already present on the device, and then sign the selected account into the same Firebase Authentication project used by the web app.

The Android app must preserve:

- Existing Firebase UIDs and user documents.
- Existing Firestore security rules based on `request.auth.uid`.
- Existing Firebase custom claims, including the `admin` claim.
- Existing callable Cloud Functions, which use `request.auth`.
- Existing profile creation and update behavior.
- Existing web login behavior when PayMatrix runs in a browser.

## Current PayMatrix authentication

The current implementation is web-only:

- `frontend/src/config/firebase.js` initializes the Firebase JavaScript SDK from `VITE_FIREBASE_*` variables.
- `frontend/src/services/authService.js` calls `signInWithPopup(auth, googleProvider)`.
- `frontend/src/redux/authSlice.js` stores the profile in Redux and `localStorage`.
- `frontend/src/App.jsx` listens to the JavaScript SDK with `onAuthStateChanged(auth, ...)` and starts Firestore listeners.
- `frontend/src/hooks/useAuth.js` preserves deferred invite navigation through `pendingInviteCode`.
- `firestore.rules` authorizes requests using Firebase Authentication UID and custom claims.
- `functions/index.js` authorizes callable operations using `request.auth` and `request.auth.token.admin`.

The mobile implementation must not simply replace `signInWithPopup` with a native plugin call and stop there. A native Firebase session and a Firebase JavaScript SDK session are separate. If the plugin signs in only on the native layer, the existing JavaScript `auth.currentUser` and `onAuthStateChanged` flow will still see a signed-out user. Firestore and callable Functions used through the JavaScript SDK would also lack the expected JavaScript Auth token.

## Required architecture

Use `@capacitor-firebase/authentication` for Android's native account chooser, but configure it with `skipNativeAuth: true`. The plugin will return the Google ID token without creating a second native Firebase session. Exchange that Google ID token with the existing Firebase JavaScript SDK by calling `signInWithCredential`.

The resulting flow is:

```text
PayMatrix native login button
  -> Android Credential Manager
  -> Device Google account chooser
  -> Google ID token for default_web_client_id
  -> Firebase JS GoogleAuthProvider.credential(idToken)
  -> Firebase JS signInWithCredential(auth, credential)
  -> Existing onAuthStateChanged listener
  -> Existing Firestore profile, rules, Functions, Redux, and routing
```

This is the recommended PayMatrix design because the application already uses the Firebase JavaScript SDK for Firestore, Storage, Functions, and auth-state observation.

## Package installation commands

Run these later from the separate Android wrapper directory, not from `frontend`:

```powershell
Set-Location "C:\Users\1080p\Desktop\personal projects\PayMatrix\android app"
npm install @capacitor/core@8 @capacitor/android@8 @capacitor/app@8
npm install @capacitor-firebase/authentication@8 firebase@12
npm install --save-dev @capacitor/cli@8
npx cap sync android
```

Keep all Capacitor packages on the same major version. `@capacitor-firebase/authentication` 8.x requires Capacitor 8.x. Commit the generated `package-lock.json` when implementation begins so CI and release builds use reproducible versions.

## Capacitor authentication configuration

The future `android app/capacitor.config.ts` must contain the following authentication settings:

```ts
/// <reference types="@capacitor-firebase/authentication" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.paymatrix.app',
  appName: 'PayMatrix',
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },
};

export default config;
```

Do not set `skipNativeAuth` to `false` while the app continues to use Firebase Auth, Firestore, and Functions through the JavaScript SDK.

## Google provider Android dependencies

After the Android project exists, edit the future `android app/android/variables.gradle` and add these values inside `ext`:

```gradle
ext {
    rgcfaIncludeGoogle = true
    androidxCredentialsVersion = '1.3.0'
}
```

Then run:

```powershell
Set-Location "C:\Users\1080p\Desktop\personal projects\PayMatrix\android app"
npx cap update android
npx cap sync android
```

The plugin's current Google setup requires `rgcfaIncludeGoogle = true`. Credential Manager is the default Google sign-in implementation. PayMatrix should call it explicitly with `useCredentialManager: true` so intent is clear and testable.

## Firebase Console setup

### 1. Register the Android app

1. Open Firebase Console.
2. Select the existing `paymatrix-174b5` project.
3. Open Project settings, then General.
4. Under Your apps, choose Add app, then Android.
5. Enter the Android package name exactly as `com.paymatrix.app`.
6. Use `PayMatrix Android` as the optional nickname.
7. Do not register a different package spelling. Firebase Android package registration is case-sensitive and cannot be changed later.

The future Gradle `applicationId` must also be exactly `com.paymatrix.app`. The Gradle namespace should normally match it.

### 2. Enable Google Authentication

1. Open Firebase Console, Authentication, Sign-in method.
2. Enable Google.
3. Select the required project support email.
4. Save.

Google is already used by the web app, but verify the provider remains enabled before testing Android.

### 3. Register SHA certificate fingerprints

Google sign-in validates the combination of package name and signing certificate. Register SHA-1 and SHA-256 for every certificate that can sign an installed PayMatrix build.

Required fingerprints:

- Local debug certificate.
- Local release or Play upload certificate.
- Google Play App Signing certificate after Play App Signing is enabled.
- Any CI signing certificate, if CI produces installable builds using a separate key.

Generate the Gradle signing report after the Android project exists:

```powershell
Set-Location "C:\Users\1080p\Desktop\personal projects\PayMatrix\android app\android"
.\gradlew.bat signingReport
```

For the standard local debug keystore:

```powershell
& "$env:JAVA_HOME\bin\keytool.exe" -list -v `
  -alias androiddebugkey `
  -keystore "$env:USERPROFILE\.android\debug.keystore" `
  -storepass android `
  -keypass android
```

For the production upload keystore:

```powershell
& "$env:JAVA_HOME\bin\keytool.exe" -list -v `
  -alias paymatrix-upload `
  -keystore "D:\secure\paymatrix-upload.jks"
```

Copy both the SHA-1 and SHA-256 values into Firebase Console, Project settings, General, Your apps, PayMatrix Android, SHA certificate fingerprints.

When Play App Signing is enabled, obtain the App signing key certificate SHA-1 and SHA-256 from Play Console, Test and release, Setup, App signing. Add those fingerprints to the same Firebase Android app. The certificate used by Google Play to sign distributed APKs is usually different from the local upload certificate.

### 4. Download the final google-services.json

Download `google-services.json` only after Google sign-in is enabled and the required SHA fingerprints are registered.

Place it at exactly:

```text
android app/android/app/google-services.json
```

Do not place it in `android app/android/`, `android app/`, or `frontend/`.

Whenever a SHA fingerprint or Firebase Android app setting changes, download a fresh copy and replace the old file.

Validate Gradle processing with:

```powershell
Set-Location "C:\Users\1080p\Desktop\personal projects\PayMatrix\android app\android"
.\gradlew.bat :app:processDebugGoogleServices
```

## OAuth client ID implications

Firebase creates or associates two relevant OAuth client types:

- Android OAuth client: identified by `com.paymatrix.app` plus a SHA-1 certificate fingerprint.
- Web application OAuth client: used as the Credential Manager server client ID and token audience.

The Android Credential Manager request must use the Web application client ID, not the Android client ID. The Google Services Gradle plugin reads `google-services.json` and generates the string resource named `default_web_client_id`. The Capacitor Firebase Authentication plugin reads that generated resource automatically.

The downloaded JSON should include:

- A `client_type: 1` Android OAuth client for each recognized package and SHA combination.
- A `client_type: 3` Web application OAuth client used to generate `default_web_client_id`.

Do not hard-code the OAuth client ID into JavaScript when the plugin can read `default_web_client_id`. Do not substitute `VITE_FIREBASE_APP_ID`; a Firebase app ID is not an OAuth client ID.

The existing web app continues to use its current Firebase Web configuration and authorized domain. Native account selection does not use a browser popup or JavaScript authorized origin. The web login at `https://pay-matrix.vercel.app` still requires the current Firebase web auth and authorized-domain configuration.

If `default_web_client_id` is missing, repeat this order:

1. Enable Google in Firebase Authentication.
2. Register SHA-1 and SHA-256.
3. Download a new `google-services.json`.
4. Run `npx cap sync android`.
5. Run `processDebugGoogleServices` again.

## Future application code contract

No code is changed by this document. The later mobile auth adapter should follow this shape:

```js
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from './config/firebase.js';

const googleProvider = new GoogleAuthProvider();

export async function signInToPayMatrixWithGoogle() {
  if (!Capacitor.isNativePlatform()) {
    return signInWithPopup(auth, googleProvider);
  }

  const nativeResult = await FirebaseAuthentication.signInWithGoogle({
    useCredentialManager: true,
  });

  const idToken = nativeResult.credential?.idToken;
  if (!idToken) {
    throw new Error('Google sign-in did not return an ID token.');
  }

  const webCredential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, webCredential);
}
```

The Android plugin currently configures Credential Manager to show all Google accounts on the device, not only accounts that previously authorized PayMatrix. No `GET_ACCOUNTS` permission is required.

The returned `UserCredential.user` from `signInWithCredential` must be passed through the existing profile bootstrap behavior in `authService.googleAuth()`:

- Reload the Firebase user if needed.
- Read `users/{uid}`.
- Create the user document if it does not exist.
- Refresh `name`, `nameLowerCase`, `photoURL`, and `avatar` for an existing user.
- Preserve the `friends` array.
- Log a successful login only after the JavaScript Firebase sign-in succeeds.

Use `await user.getIdToken()` if application code needs a current Firebase ID token. Do not rely on the undocumented `user.accessToken` property.

### Sign-out contract

Sign out from the Firebase JavaScript SDK and clear Credential Manager state:

```js
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { signOut } from 'firebase/auth';

await signOut(auth);
await FirebaseAuthentication.signOut();
```

The Redux user and `paymatrix_user` local storage entry must still be cleared. Clearing Credential Manager state prevents the next sign-in from silently reusing stale credential state.

## Account identity and migration behavior

No account migration should be required. A Google account signing into the same Firebase project and provider should resolve to the same Firebase user UID on web and Android.

Verify this before release:

1. Sign into the web app and record the UID from Firebase Authentication.
2. Sign out.
3. Sign into Android with the same Google account.
4. Confirm the UID is identical.
5. Confirm the existing `users/{uid}` document is reused and not duplicated.
6. Confirm existing groups, balances, friends, and admin custom claims are present.

If a different UID appears, stop release testing. The Android app is probably connected to a different Firebase project, using a different auth provider, or exchanging a token against the wrong Firebase JavaScript configuration.

## Backend and security-rule impact

### Required backend code changes

None, provided all of the following remain true:

- Android uses Firebase project `paymatrix-174b5`.
- The native Google ID token is exchanged into the existing Firebase JavaScript Auth instance.
- Firestore and Functions continue to be called by the Firebase JavaScript SDK.
- The app does not create its own unsigned or unverified session token.

The existing rules and Functions remain valid because they authorize Firebase ID tokens, not web browser sessions:

- `request.auth.uid` in Firestore rules remains the Firebase UID.
- `request.auth.token.admin` remains the Firebase custom claim.
- Callable Functions continue to receive `request.auth` automatically from the signed-in JavaScript SDK.
- Firebase Admin SDK behavior does not change.

### Firebase Console changes required

- Add the Android Firebase app for `com.paymatrix.app`.
- Add all SHA-1 and SHA-256 fingerprints.
- Verify Google provider is enabled.
- Download and install the updated `google-services.json`.
- Add the Play App Signing fingerprints after the first Play Console setup.

### Optional hardening

Firebase App Check with Play Integrity is recommended before broad production rollout. Introduce it in monitor-only mode first, register debug tokens for local development, observe valid and invalid request metrics, and only then enforce it for Firestore, Functions, and Storage. Enabling enforcement without shipping a working Android App Check provider can block all Android traffic.

## Deep links and Google sign-in

Native Google account selection through Credential Manager does not require a custom URL scheme or an OAuth redirect intent filter. Do not add a fake OAuth callback scheme for this flow.

PayMatrix still needs Android App Links for product routes such as:

```text
https://pay-matrix.vercel.app/join/{code}
```

That setup is documented in `04-ANDROID-CONFIGURATION.md`. It is separate from Google authentication. The current `pendingInviteCode` behavior must be preserved so an unauthenticated user can open an invite link, sign in with the native chooser, and continue to `/join/{code}`.

## Privacy and security requirements

- Request only the default Google identity scopes needed for basic profile data. Do not request Drive, Contacts, Calendar, or Gmail scopes.
- Do not request Android `GET_ACCOUNTS`; Credential Manager handles account selection without exposing the device account list directly to PayMatrix.
- Never log Google ID tokens, Firebase ID tokens, access tokens, OAuth authorization codes, or full `google-services.json` content.
- Never store Google or Firebase tokens in Redux, `localStorage`, Firestore, analytics, crash logs, or plaintext files.
- Treat cancellation as a normal user action, not a security error.
- Avoid placing email addresses in failure telemetry before Firebase authentication succeeds.
- Keep service-account JSON, Admin SDK private keys, Gemini secrets, signing keystores, and keystore passwords out of the APK and repository.
- The Firebase Web API key and values in `google-services.json` identify the Firebase project but are not authorization secrets. Security must come from Firebase Auth, Rules, App Check, API restrictions where applicable, and protected server credentials.
- Document Google authentication and collected account fields in the privacy policy and Google Play Data safety form.
- Display the account chooser only after an explicit user action on the login screen.

## Error handling and troubleshooting

### `DEVELOPER_ERROR` or status code 10

Usually caused by a package name, SHA-1, OAuth client, or stale `google-services.json` mismatch.

Check:

```powershell
Set-Location "C:\Users\1080p\Desktop\personal projects\PayMatrix\android app\android"
.\gradlew.bat signingReport
.\gradlew.bat :app:processDebugGoogleServices
```

Then compare the installed variant's certificate SHA-1 with Firebase Console and redownload the JSON.

### `No credentials available`

The device or emulator has no usable Google account. Use an emulator image with Google Play, update Google Play services, and add a Google account in Android Settings.

### `getCredentialAsync no provider dependencies found`

Confirm all of the following:

- `rgcfaIncludeGoogle = true` exists in `android/variables.gradle`.
- `providers: ['google.com']` exists in Capacitor config.
- `npx cap update android` and `npx cap sync android` completed.
- The emulator image includes current Google Play services.

### Native chooser succeeds but PayMatrix returns to login

This indicates the JavaScript Firebase session was not established. Confirm:

- `skipNativeAuth: true` is configured.
- `nativeResult.credential.idToken` exists.
- `signInWithCredential(auth, GoogleAuthProvider.credential(idToken))` completes.
- `onAuthStateChanged` receives the JavaScript Firebase user.
- The JavaScript Firebase project ID is `paymatrix-174b5`.

### Existing web popup opens inside Android

The platform branch is wrong. Confirm `Capacitor.isNativePlatform()` is true in the APK and that the native adapter is used by the Android login screen.

## Test matrix

Authentication is release-ready only after all of these pass:

- Physical Android device with one Google account.
- Physical Android device with multiple Google accounts.
- Play-enabled emulator with a signed-in Google account.
- User cancels the chooser.
- Device has no Google account.
- Offline sign-in attempt.
- Existing PayMatrix web user signs into Android and receives the same UID.
- New user signs in and receives one valid Firestore user document.
- Sign out, then sign in as a different account with no stale profile data.
- App process is killed while signed in, then restored.
- Firebase token refresh succeeds after at least one hour or forced refresh.
- Admin custom claim remains effective after Android sign-in.
- Firestore read/write and callable Function calls carry `request.auth`.
- Invite App Link opens while signed out, survives native login, and resumes join flow.
- Debug build works with the debug SHA.
- Internal Play test build works with the Play App Signing SHA.

## Completion checklist

- [ ] Android app registered in `paymatrix-174b5` as `com.paymatrix.app`.
- [ ] Google provider enabled.
- [ ] Debug SHA-1 and SHA-256 registered.
- [ ] Upload/release SHA-1 and SHA-256 registered.
- [ ] Play App Signing SHA-1 and SHA-256 registered.
- [ ] Updated JSON placed at `android app/android/app/google-services.json`.
- [ ] `client_type: 3` web client is present in the JSON.
- [ ] Google provider dependency is enabled in `variables.gradle`.
- [ ] Capacitor config uses `skipNativeAuth: true` and only `google.com`.
- [ ] Credential Manager chooser shows all on-device Google accounts.
- [ ] Google ID token is exchanged with Firebase JavaScript `signInWithCredential`.
- [ ] Existing user UID and Firestore document are preserved.
- [ ] JavaScript Firebase sign-out and native credential-state clearing both run.
- [ ] Auth tokens are absent from logs and application storage.
- [ ] Physical-device and Play internal-track tests pass.

## Official references

- Capacitor Firebase Authentication: https://capawesome.io/docs/plugins/firebase/authentication/
- Plugin Google setup: https://github.com/capawesome-team/capacitor-firebase/blob/main/packages/authentication/docs/setup-google.md
- Current Android Google handler: https://github.com/capawesome-team/capacitor-firebase/blob/main/packages/authentication/android/src/main/java/io/capawesome/capacitorjs/plugins/firebase/authentication/handlers/GoogleAuthProviderHandler.java
- Firebase Google authentication on Android: https://firebase.google.com/docs/auth/android/google-signin
- Add Firebase to Android: https://firebase.google.com/docs/android/setup
- Firebase API key guidance: https://firebase.google.com/docs/projects/api-keys
- Android Credential Manager: https://developer.android.com/identity/sign-in/credential-manager
- Play App Signing: https://support.google.com/googleplay/android-developer/answer/9842756
