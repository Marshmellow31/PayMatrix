# paymatrix Android 2.1.4 release record

## Scope

Version 2.1.4 adds verified email/password authentication alongside the existing Google sign-in flow. It preserves package `com.paymatrix.app`, existing Firebase UIDs and collections, integer-paise financial behavior, and the established release signing identity.

### Authentication and account changes

- Adds native email registration with a required display name.
- Sends a Firebase verification email and blocks shared app data until verification succeeds.
- Adds email/password sign-in, verification resend, and password reset.
- Lets an authenticated Google user link an email password without changing their UID or copying database records.
- Uses provider-aware reauthentication for account deletion.
- Keeps Google sign-in available as the first authentication option.

## Verification completed on 4 September 2026

- Frontend: ESLint, 31 unit tests, and the production Vite/PWA build passed.
- Firestore authorization emulator: 23 tests passed, including verified and unverified password-session cases.
- Android: unit tests, release lint, R8/resource shrinking, and signed release APK assembly passed.
- Identity: `com.paymatrix.app`, version `2.1.4` (`21004`), min SDK 24, target SDK 36, app label `paymatrix`.
- APK Signature Scheme v2 verification passed with one signer.
- Certificate SHA-256: `77bc53c8e4c6eeb17449750b0bd1d83901682030219e8a363963428e9820659f`.
- APK 16 KiB page-alignment verification passed.
- APK SHA-256: `11af4a53859c6da48b2aa4337d4131d696642ce7a28c8ba95e7b49d01911b106`.

## Remaining external gates

Enable Email/Password in Firebase Authentication, configure the email templates and authorized production domain, deploy the web/rules changes, create a pre-verified reviewer account, update Play App access and Data safety, and complete physical-device upgrade/login checks before Play submission.
