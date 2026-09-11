# PayMatrix Android Play Store Release

## Purpose

This is the production release runbook for the separate PayMatrix Android app. It covers application
identity, Firebase registration, native Google login, signing, versioning, APK/AAB generation, Play
Console tracks, privacy, Data Safety, and rollout.

Do not publish until every placeholder in this document has been replaced and the release checklist is
signed off. Package name, Play app-signing identity, and production data declarations are long-lived
decisions.

## Release Decisions to Freeze

Record these values in the Android project's release configuration and release ledger:

| Decision | Required value |
| --- | --- |
| Application/package ID | `com.paymatrix.app` - implemented; confirm before first Play upload |
| Play Console app name | `PayMatrix` |
| Firebase project | `paymatrix-174b5` unless a migration is approved |
| Production Firebase Android app ID | `1:344969363066:android:f200bee5cbcf086a3305c3` |
| Minimum Android version | API 24 / Android 7.0 |
| Compile/target SDK | API 36 for a release prepared in 2026; verify current Play policy before upload |
| Version name | `1.2.0` |
| Version code | `10200`; increment before every subsequent Play upload |
| Support email and website | Public, monitored values |
| Privacy policy URL | Public HTTPS HTML page, not a file or access-controlled document |
| Account deletion URL | Public page that lets a user request deletion outside the app |

`com.paymatrix.app` cannot be changed for an existing Play listing. A changed package name is a different
app with a new listing, installs, reviews, signing identity, Firebase registration, and deep links.

As of August 31, 2026, new apps and updates must target Android 16/API 36 or higher. Target API 36 now
for a new PayMatrix release and verify the live policy before every production submission:
[Play target API requirements](https://developer.android.com/google/play/requirements/target-sdk).

## Firebase Android Registration

The current web app uses Firebase project `paymatrix-174b5`. Native Android support requires a separate
Android app registration inside that same project; the existing web app registration is not enough.

### Create the Android app

1. Open Firebase Console > Project settings > General > Your apps.
2. Add Android app.
3. Enter the final `APPLICATION_ID` exactly. It is case-sensitive and must match Gradle.
4. Set nickname such as `PayMatrix Android Production`.
5. Register the app and download `google-services.json`.
6. Place the file only in the Android app module location expected by the Google Services plugin.
7. Do not put `google-services.json` in `frontend/`. It contains public app identifiers, but environment
   separation still matters and it must not be confused with a service-account key.
8. Repeat with separate app registrations or projects for staging/debug according to the chosen
   environment strategy.

Never include `scripts/serviceAccountKey.json`, a Firebase Admin private key, upload-key password, or
Google OAuth client secret in an APK/AAB. Android clients use `google-services.json`; trusted Admin SDK
credentials belong only on servers/CI secret stores.

### Native Google login

The Android login screen must launch the supported native Google credential/account chooser. It must
not call the current web `signInWithPopup` path.

Firebase Console tasks:

1. Authentication > Sign-in method: confirm Google provider is enabled.
2. Project settings > Android app: add SHA-1 and SHA-256 for every signing identity used to test or
   distribute the app.
3. Download a refreshed `google-services.json` after configuration changes if Firebase instructs it.
4. Confirm the OAuth consent screen, support email, branding, and production status in Google Cloud.
5. Test first sign-in and returning sign-in on an account that has never granted consent.

Required certificate fingerprints:

- debug keystore certificate for local debug builds;
- local release/upload certificate for directly installed release APKs;
- upload certificate registered with Play Console; and
- Play app-signing certificate, copied from Play Console after Play App Signing is enabled.

Play signs delivered APKs with the app-signing key, not the local upload key. Native Google login can
work in a sideloaded build and fail from Play if the Play app-signing SHA-1/SHA-256 is missing from the
Firebase Android app.

Inspect a keystore certificate without exposing its password in command history:

```powershell
keytool -list -v -keystore C:\secure\paymatrix-upload.jks -alias paymatrix-upload
```

### Native FCM

The browser FCM implementation stores one `users/{uid}.fcmToken` and depends on a service worker/VAPID
key. Native Android needs Firebase Messaging in the Android project and should store device-scoped token
records, for example `users/{uid}/devices/{installationId}`, rather than overwrite one token.

Backend work required before production:

- accept multiple device tokens per user;
- update token on refresh and associate it only after auth;
- remove the current device token on logout/account deletion;
- send platform-appropriate notification payloads and channel IDs;
- handle stale/unregistered tokens; and
- authorize notification deep links before displaying destination data.

The Cloud Function `sendPushOnNotification` must be reviewed and tested against the new schema before
native notifications are enabled.

## Upload Key and Play App Signing

Use Play App Signing. Let Google protect the app-signing key and use a separate upload key for CI and
developer uploads. Losing an upload key is recoverable through Play; exposing secrets or self-managing
the only app-signing key creates substantially more operational risk.

### Generate the upload key once

Run on a trusted machine and follow the current key-size guidance shown by Play Console:

```powershell
keytool -genkeypair -v `
  -keystore C:\secure\paymatrix-upload.jks `
  -alias paymatrix-upload `
  -keyalg RSA `
  -keysize 4096 `
  -validity 10000
```

Rules:

- Never create the keystore inside the Git repository.
- Never commit `keystore.properties`, passwords, base64 keystore contents, or CI output containing them.
- Store the keystore in an encrypted password manager/vault with an access-controlled offline backup.
- Store keystore password and key password as separate CI secrets.
- Give Play Console and release access only to named people with 2-Step Verification.
- Record alias, certificate SHA-1/SHA-256, creation date, owners, backup location, and recovery process.
- Test the backup by restoring it on a clean machine before the first production release.

### Gradle signing configuration

The future Android project should read release signing values from ignored local properties and CI
secrets. A release build must fail closed when a required signing value is missing. It must never fall
back to the debug key.

Expected secret names may include:

```text
PAYMATRIX_UPLOAD_STORE_FILE
PAYMATRIX_UPLOAD_STORE_PASSWORD
PAYMATRIX_UPLOAD_KEY_ALIAS
PAYMATRIX_UPLOAD_KEY_PASSWORD
```

Do not print these values. Mask them in CI and prevent Gradle diagnostic output from dumping environment
variables.

Official reference: [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756).

## Versioning

Use independent Android release identity even if user-facing versions are coordinated with the web app.

- `versionName`: human-readable, for example `1.0.0`, `1.1.0`, or `1.1.1`.
- `versionCode`: monotonically increasing integer consumed by Play, for example `10000`, `10100`,
  `10101`. Never reuse a code uploaded to Play, even if that release was discarded.
- Record Git commit, build timestamp, environment, and version in a diagnostics screen or support export,
  without exposing secrets.
- A rollback on Play is a forward release built from older known-good code with a new higher version
  code. Do not plan to upload an older AAB with a lower code.

Suggested policy:

| Change | Version name example | Version code action |
| --- | --- | --- |
| Initial production | `1.0.0` | Start documented sequence |
| Backward-compatible feature | `1.1.0` | Increase |
| Bug/security fix | `1.1.1` | Increase |
| Breaking product/data behavior | `2.0.0` | Increase |

Automate version-code uniqueness in CI. The build must fail if the code is not greater than the latest
Play artifact.

## Build APK and AAB

Use a supported Android toolchain and a clean checkout. On this Windows machine, Java currently reports
Java 8; modern Android Gradle builds require a newer JDK, normally the JDK bundled with current Android
Studio or the version required by the selected Android Gradle Plugin. Fix the toolchain before treating
build results as production evidence.

From the future `android app` directory:

```powershell
Set-Location "C:\Users\1080p\Desktop\personal projects\PayMatrix\android app"
.\gradlew.bat --version
.\gradlew.bat clean test lint assembleRelease bundleRelease
```

Expected artifacts typically are:

```text
app/build/outputs/apk/release/app-release.apk
app/build/outputs/bundle/release/app-release.aab
```

- Use APK for direct device QA and Firebase App Distribution.
- Use AAB for Play Console.
- Run `apksigner verify --verbose --print-certs` on direct-release APKs.
- Use `bundletool` or Play Internal App Sharing to inspect device-specific delivery from the AAB.
- Generate and archive mapping/symbol files needed by Crashlytics for every release.
- Produce SHA-256 checksums and attach them to the release record.
- Do not email or publicly upload a release APK that points at staging with production-like data.

## Play Console Setup

Complete the account and app setup before release week:

- Verify developer identity and register the package name as required by current Android/Play policy.
- Enforce 2-Step Verification and least-privilege roles.
- Create the app with exact default language, app/game choice, free/paid status, and declarations.
- Enroll in Play App Signing.
- Add support contact details.
- Complete store listing, content rating, target audience, ads declaration, app access instructions,
  Data Safety, privacy policy, account deletion, and permission declarations.
- Declare financial features accurately. PayMatrix tracks shared expenses but must not be represented as
  a bank, lender, wallet, payment processor, or regulated financial product unless those capabilities
  actually exist and legal review approves the wording.
- Add reviewer test credentials or exact native Google sign-in instructions under App access if gated.

### Store listing assets

Prepare from actual release UI:

- app name and concise/complete descriptions;
- high-resolution icon and Play feature graphic;
- phone screenshots from the Android app, not desktop web mockups;
- tablet screenshots if tablet support is declared;
- support email, website, privacy URL, and account deletion URL; and
- release notes describing user-visible changes without internal implementation details.

Do not include personal financial data, real email addresses, invite codes, or production group names in
screenshots. Use seeded synthetic accounts.

## Play Track Strategy

Promote the same tested AAB; do not rebuild between tracks.

1. Internal testing: release team and smoke testers. Validate Play signing, native Google login, update,
   notifications, deep links, Crashlytics mapping, and billing/permissions declarations if applicable.
2. Closed testing: representative device users and real-world workflows. Meet any account-specific
   testing requirement shown by Play Console before production access.
3. Open testing: optional. Use only when support, privacy language, feedback intake, and backend capacity
   are ready for public testers.
4. Production: staged rollout, beginning with a small percentage. Increase only after observing
   crash-free users/sessions, ANRs, startup, permission/auth failures, backend errors, and support reports.

At every promotion, record who approved it, the artifact version/code/hash, release notes, countries,
device exclusions, rollout percentage, start time, and monitoring owner.

Do not perform a full rollout immediately after approval. Leave enough observation time for daily active
users and delayed crash/ANR reports to become meaningful.

## Data Safety and Privacy

The Play Data Safety form describes actual collection by the app, WebView, backend, and every SDK. A
WebView controlled by PayMatrix is part of the app and its Firebase data flows must be declared.

Audit the final binary and backend before answering. Likely PayMatrix data categories include:

| Data | PayMatrix example | Likely purpose to verify |
| --- | --- | --- |
| Name, email, user ID, profile photo URL | Google/Firebase account and `users/{uid}` | Account management, app functionality |
| User-generated financial information | Expenses, shares, balances, settlements | Core app functionality |
| User-generated content | Group names, notes, activity/log records | Core app functionality |
| Photos/files | Receipt images or scanned bills, if enabled | App functionality |
| Device or other identifiers | Firebase installation/FCM device token | App functionality, notifications, security |
| App interactions | Analytics events, if enabled | Analytics |
| Crash logs and diagnostics | Crashlytics, ANR, performance traces | App stability and diagnostics |
| Security events | Login success/failure logs | Fraud prevention, security, compliance |

Do not mark data as not collected merely because Firebase stores it. Sending data off-device to a
developer-controlled Firebase project is collection for the form. Confirm whether each data type is
required or optional, retained, deletable, encrypted in transit, and shared with third parties under
Play definitions.

Privacy policy requirements:

- public HTTPS HTML URL, accessible without login and not geofenced;
- identifies PayMatrix and the developer/entity listed on Play;
- contact method for privacy questions;
- exact data collected, purpose, processors/SDKs, sharing, security, retention, and deletion;
- explains Google sign-in, Firebase Auth, Firestore, Cloud Functions, Storage, FCM, Crashlytics,
  Analytics/Performance only if actually enabled, and Gemini bill scanning if released;
- explains whether receipt content is sent to Gemini/Google for processing and for how long;
- matches in-app disclosures and the Play Data Safety form; and
- has a version/effective date and change process.

Because PayMatrix creates accounts, production needs both an in-app deletion entry and an external web
deletion request URL. Deletion must remove the Firebase Auth account and associated personal data, or
retain/anonymize only data that the published policy and legal obligations permit. Shared expense
history needs a defined product rule so deleting one user does not corrupt other members' records.

Official references:

- [Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Play Developer Program Policy](https://support.google.com/googleplay/android-developer/answer/17105854)

## Permissions

Request the minimum permissions at the moment their feature is used:

- `POST_NOTIFICATIONS` on Android 13+ only after explaining notification value;
- camera only when the user starts receipt scanning;
- selected photo/document access through system pickers, avoiding broad storage permissions; and
- internet/network state as required by the architecture.

Do not request contacts, SMS, call logs, precise location, broad storage, accessibility service, device
admin, or background location unless a new core feature is approved with policy/legal review. Remove
unused transitive permissions before release and verify the merged manifest, not just source manifests.

## Production Release Checklist

### Identity and Firebase

- [ ] Final `APPLICATION_ID` is approved and identical in Gradle, Firebase, OAuth, Play, App Links, and
      backend allowlists.
- [ ] Production Firebase Android app exists in `paymatrix-174b5`.
- [ ] Debug, upload, and Play app-signing SHA-1/SHA-256 fingerprints are registered.
- [ ] Native Google chooser works from a Play-installed build.
- [ ] Native multi-device FCM schema and Cloud Function behavior are deployed and tested.
- [ ] App Links and invite continuation work after fresh install.

### Artifact and quality

- [ ] JDK/Gradle/Android SDK versions are pinned and supported.
- [ ] Clean test, lint, release APK, and release AAB builds pass.
- [ ] Release artifact is signed with upload key, not debug key.
- [ ] AAB hash, mapping/symbol files, commit, version name, and version code are archived.
- [ ] `06-TESTING.md` and performance gates pass on the Play-delivered artifact.
- [ ] Crashlytics test event and ANR visibility are confirmed for the release build.

### Play and privacy

- [ ] Store listing and screenshots match the Android app.
- [ ] App access instructions let reviewers authenticate.
- [ ] Data Safety matches every SDK, WebView flow, Firebase service, and Gemini flow in the binary.
- [ ] Privacy policy and account deletion URLs are public and available in-app.
- [ ] Content rating, target audience, ads, permissions, and financial declarations are accurate.
- [ ] Support and privacy inboxes are monitored.

### Rollout

- [ ] Same AAB passed internal and closed-track gates.
- [ ] Backend migrations are backward-compatible with current web and previous Android versions.
- [ ] Dashboards, alerts, support owner, and forward-fix procedure are ready.
- [ ] Initial production rollout is staged and has explicit stop/go thresholds.
- [ ] Release owner can halt rollout and ship a higher-version-code fix.
