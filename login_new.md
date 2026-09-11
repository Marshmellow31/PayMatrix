# paymatrix verified email sign-in plan

**Status:** Implemented locally; Firebase Console enablement, production deployment, and Play release are pending
**Date:** 2026-09-04
**Scope:** React/Vite web app, Kotlin/Compose Android APK, Firebase configuration, policy copy, tests, and Google Play Console handoff

## Goal

Keep Google sign-in and add email/password registration and sign-in with email verification. Ask for a name only when a person creates an email account. Preserve all existing Firebase UIDs, Firestore collections, groups, expenses, settlements, friends, spending logs, and audit history.

## Safety contract

- Continue using Firebase project `paymatrix-174b5`.
- Keep the production package `com.paymatrix.app` and existing signing identity.
- Do not rename collections, backfill existing users, rewrite financial documents, or merge accounts by email address.
- Treat Firebase UID as the only identity key.
- Do not create `users`, `publicProfiles`, or `friendCodes` data for a password account until its email is verified.
- Block an unverified password session before Firestore profile/notification listeners or shared-data reads start.
- Keep Google accounts and their current UIDs/data unchanged.
- If an existing Google user wants a password, link the password credential while that user is authenticated; never create a second profile and copy data into it.

## User experience

Use one clean authentication surface on web and Android:

1. **Sign in** and **Create account** tabs.
2. **Continue with Google** remains the first option.
3. A quiet **or use email** separator.
4. Sign in fields: email and password, plus **Forgot password?**.
5. Create fields: name, email, and password.
6. After registration, show a focused **Check your email** screen with:
   - destination email address;
   - three short steps;
   - **I've verified my email**;
   - resend action with throttling feedback;
   - option to use another account.
7. Never ask for the name during normal sign-in.
8. Use lowercase `paymatrix` and the existing `logo.png`.
9. Keep the Digital Obsidian visual system: restrained surfaces, strong white primary action, emerald trust cue, large touch targets, immediate pressed feedback, no decorative motion that slows authentication, and accessible labels/autofill metadata.

## Account state model

| State | Allowed behavior |
|---|---|
| Google account | Existing sign-in and profile bootstrap |
| New email account, unverified | Verification screen only; no app-data access |
| Email account, verified | Existing provider-neutral profile bootstrap, then app access |
| Existing Google account adding password | Link credential to the current Firebase user so UID remains unchanged |
| Email collision or unknown provider | Neutral recovery message; sign in with the earlier provider or reset password; no data merge |

## Implementation phases

### 1. Web authentication service and state

- Add Firebase email account creation, password sign-in, verification resend/reload, password reset, and credential linking.
- Extract Google-only profile setup into a provider-neutral `ensureUserProfile` function using merge-safe writes.
- Store the submitted name as Firebase Auth `displayName` before verification; bootstrap Firestore only after verification.
- Add Redux states/actions for pending verification without placing an unverified person in the authenticated app state.
- Preserve invite codes, return paths, and create-group intent through the auth flow.
- Map Firebase errors to neutral, non-enumerating messages.

### 2. Web UI

- Integrate the approved preview into `/login` and `/register`.
- Make `/register` open the same surface in Create account mode so there is one maintained component.
- Add verification and password-reset feedback states.
- Retain Google sign-in and existing Terms/Privacy links.
- Remove the temporary `/auth-preview` route after the real screen is approved and verified.

### 3. Native Android authentication

- Add provider-neutral bootstrap and email/password methods to `AuthRepository` using the existing Firebase Auth dependency.
- Make session restoration reject unverified password sessions.
- Add registration, sign-in, reset, resend, and verification-check actions to `PayMatrixViewModel`.
- Implement the same compact flow in Compose, with password visibility, keyboard types, IME actions, scroll/safe-area handling, and no WebView dependency.
- Keep Google Credential Manager unchanged.
- Make deletion reauthentication provider-aware: Google chooser for Google users and current password for password users.

### 4. Firestore rules

- Add a verified-session helper based on the Firebase token's verified-email claim.
- Require it in addition to all existing admin, ownership, membership, and shape checks.
- Add emulator cases proving unverified password users cannot read or write app data while verified Google/password users retain existing access.
- Run the entire existing rules suite to ensure no financial workflow regresses.

### 5. Legal and in-app copy

- Update Terms from Google-only authentication to Firebase Authentication via Google or verified email/password.
- Update Privacy to cover name/email collection, verification email, password reset email, and Firebase processing.
- Update Delete Account instructions and reauthentication copy for both providers.
- Never claim paymatrix receives or stores a user's password; Firebase Authentication handles it.

### 6. Firebase Console changes

Perform only after code and emulator tests pass:

1. Authentication > Sign-in method: enable **Email/Password**. Do not enable passwordless Email Link for this release.
2. Authentication > Settings: keep one account per email and email-enumeration protection enabled.
3. Password policy: require at least 8 characters and keep the UI hint exactly aligned with the console policy.
4. Authentication > Templates: brand verification and password-reset email templates as lowercase `paymatrix`.
5. Use an HTTPS continue URL on `pay-matrix.vercel.app` and confirm the production domain is authorized.

No Firestore schema migration or production data rewrite is required.

### 7. Test gates

**Web**

- Registration validation and Firebase error mapping.
- Unverified route/listener block.
- Verification, resend, reset, and successful bootstrap.
- Google sign-in regression.
- Existing invite and return-to routing.
- Lint, unit tests, formatting, and production build.

**Android**

- Registration/sign-in/verification state transitions.
- Rotation and process restart while verification is pending.
- Same-device and different-device verification.
- Gmail and non-Gmail addresses.
- Password reset and provider-aware account deletion.
- Existing Google account chooser on a signed-in physical device.
- Unit tests, lintRelease, R8 release APK/AAB, signature continuity, 16 KiB alignment, upgrade install, and fatal-log check.

**Database regression**

- Existing Firestore rules suite plus unverified-user denies.
- Existing Google UID and representative document snapshots remain unchanged.
- No documents are created before email verification.

### 8. Google Play Console changes

Update when the new AAB is ready:

1. **Policy and programs > App content > App access:** provide a durable, pre-verified reviewer email/password account and exact steps. Mention Google sign-in remains available. The reviewer must not need access to the owner's inbox or be forced to create an account.
2. **App content > Data safety:** retain Name, Email address, and User IDs as collected for app functionality/account management. Add the account-creation choice that covers username/email plus password and keep OAuth selected. The existing data-type disclosure already includes name and email, so this feature does not by itself add a new data type.
3. **Privacy policy:** publish the provider-neutral wording before review.
4. **Terms:** publish the provider-neutral registration/security wording.
5. **Release:** keep package/signing identity, use version `2.1.4` (`21004`), and add release notes such as “Added verified email sign-in; Google sign-in remains available.”

No change is expected solely from this feature to Ads, Target audience, Content rating, Android permissions declarations, app category, Play App Signing, or tester lists. Re-check Data safety against the final built artifact before submission.

## Rollout order

1. Finish web and Android code behind the same verified-session contract.
2. Pass unit, rules, lint, and build gates without touching production data.
3. Enable and configure Email/Password in Firebase.
4. Test with new dedicated test identities.
5. Verify existing Google accounts retain their exact UIDs and data.
6. Publish web first.
7. Build the next signed AAB/APK and test an upgrade from 2.1.3.
8. Update Play App content and the reviewer account.
9. Release through internal testing, then the intended Play track.

## Rollback

Hide the email UI and disable the Firebase Email/Password provider. Existing Google accounts and all UID-keyed Firestore data remain usable. Do not delete email-created Auth users or their data during rollback.

## Local implementation result

- Web login, registration, email verification, resend, reset, and Google credential linking are implemented.
- Native Android login, registration, verification, resend, reset, linking, and provider-aware deletion are implemented.
- Android release version is `2.1.4` with Play version code `21004`.
- Unverified password sessions are blocked before shared Firestore data is read or written.
- Web lint, 31 unit tests, production build, 23 Firestore emulator tests, Android unit tests, release lint, R8, signed release APK assembly, and signed release AAB assembly pass.
- The live web preview is available at `http://127.0.0.1:5179/login` while the local development server is running.
