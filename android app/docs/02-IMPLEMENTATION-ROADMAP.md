# PayMatrix Android App: Implementation Roadmap

## Purpose

This roadmap converts the goals and architecture into ordered work with explicit outputs, verification, phase gates, Firebase changes, and rollback points. It is written for this repository and current Windows workstation.

This roadmap was written before implementation. See `09-IMPLEMENTATION-STATUS.md` for the commands
that have now run, evidence, and remaining release gates.

## Current workstation audit

Observed on August 4, 2026:

| Tool | Current state | Required action |
| --- | --- | --- |
| Node.js | `v24.18.0` | Ready for Capacitor 8 core requirement. |
| npm | `11.6.2` | Ready. |
| Java on `PATH` | Java 8, `1.8.0_471` | Do not use for the Android build. Use Android Studio's bundled JDK. |
| `adb` | Installed in `C:\Users\1080p\AppData\Local\Android\Sdk\platform-tools` | Verified with an API 36 emulator. |
| Global Gradle | Not installed | Not required; use the generated Gradle wrapper. |
| `ANDROID_HOME` | Not globally required | Build scripts resolve the installed SDK automatically. |
| `ANDROID_SDK_ROOT` | Not globally required | Build scripts write an ignored, valid `local.properties`. |
| Android Studio | Installed at `C:\Program Files\Android\Android Studio` | Bundled JBR 21 is used automatically. |
| Android SDK | Installed under `%LOCALAPPDATA%\Android\Sdk` | Platform/build tools 36 and API 36 emulator verified. |

Do not solve the Java mismatch by installing an arbitrary global Gradle. Android Studio's supported JDK plus the checked-in Gradle wrapper gives the reproducible path.

## Workstream ownership

The work can be parallelized after Phase 0, but each stream has one integration owner.

| Workstream | Primary area | Dependencies |
| --- | --- | --- |
| A: Wrapper and build | `android app/`, Vite Android mode | Phase 0 decisions |
| B: Native auth and login | Firebase Console, auth adapter, Login | Wrapper boots and package ID fixed |
| C: Navigation and device UX | App bridge, router, modals, system UI | Wrapper boots |
| D: Push and backend | `functions/`, rules, native messaging | Package/Firebase app registered |
| E: Performance | UI hotspots, native benchmark module | Primary journeys functional |
| F: Release and Play | Signing, CI, listing, test tracks | Stable release candidate |

Parallel work must not create separate copies of frontend pages. All streams merge through the platform contract in `frontend/src/platform/` and the Android workspace.

## Phase 0: Lock decisions and protect the baseline

### Inputs required from the product owner

- Confirm the implemented package ID `com.paymatrix.app` before creating the Play listing.
- Final app name shown on device and Play Store.
- Minimum Android version, with API 24 as the technical baseline.
- Canonical App Links domain.
- Play Console account type and creation date.
- Privacy policy URL, support email, and account deletion URL.
- Whether mobile admin routes ship in version 1.
- Test device access, including one physical high-refresh phone.

### Repository baseline checks

Run from repository root:

```powershell
git status --short
npm --prefix .\frontend ci
npm --prefix .\frontend run lint
npm --prefix .\frontend run test
npm --prefix .\frontend run build
git diff --check
```

Record existing failures instead of mixing unrelated fixes into Android work.

### Toolchain setup

1. Install Android Studio 2025.2.1 or later.
2. Install Android SDK Platform 36.
3. Install Android SDK Build-Tools, Platform-Tools, Command-line Tools, and Emulator.
4. Use Android Studio's bundled JDK.
5. Create at least one API 36 emulator with Google Play services.
6. Enable developer options and USB debugging on physical test phones.
7. Verify:

```powershell
node --version
npm --version
& "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" -version
adb version
adb devices
```

### Phase output

- Approved decision record.
- Green or explicitly baselined web checks.
- Working Android Studio, SDK 36, JDK, emulator, and physical device connection.

### Gate 0

Do not generate the Android project until the package ID is approved.

### Rollback

No source migration occurs in this phase. Uninstalling local tooling does not affect the repository.

## Phase 1: Create the separate Capacitor workspace

### Planned packages

Install all Capacitor packages at the same major version:

- `@capacitor/core`
- `@capacitor/cli` as a development dependency
- `@capacitor/android`
- `@capacitor/app`
- `@capacitor/status-bar` or the current system-bars plugin selected for Capacitor 8
- `@capacitor/splash-screen`
- `@capacitor/keyboard`
- `@capacitor/haptics`
- `@capacitor/share`
- `@capacitor/filesystem`
- `@capacitor/push-notifications` or the chosen Firebase Messaging plugin, not both without a documented reason
- `@capacitor-firebase/authentication` version compatible with Capacitor 8

Use exact versions in the lockfile. Confirm current plugin compatibility before installation.

### Planned initialization

From repository root after package ID approval:

```powershell
Set-Location ".\android app"
npm init -y
npm install @capacitor/core@^8 @capacitor/android@^8 @capacitor/app@^8
npm install -D @capacitor/cli@^8
npx cap init PayMatrix com.paymatrix.app --web-dir www
npx cap add android
```

The actual package ID must replace the candidate.

### Capacitor config baseline

Planned values:

```text
appId: approved package ID
appName: approved display name
webDir: www
loggingBehavior: debug
android.path: android
android.allowMixedContent: false
android.webContentsDebuggingEnabled: false for release
server.hostname: localhost
server.androidScheme: https
```

Never set a production `server.url`. Live reload may use a developer-only config that is excluded from release.

### Build scripts

Add scripts equivalent to:

```text
web:build        -> build frontend in android mode into android app/www
android:sync     -> web:build, validate assets, cap sync android
android:open     -> cap open android
android:run      -> android:sync, cap run android
android:apk      -> android:sync, gradlew assembleDebug
android:aab      -> android:sync, gradlew bundleRelease
```

Use Node scripts for path-safe asset validation and copying. Do not rely on shell-only commands that behave differently between Windows and CI.

### Vite Android mode

Make the minimum future changes in `frontend/vite.config.js`:

1. Export config as a mode-aware function.
2. Keep `VitePWA(...)` for normal web mode.
3. Omit `VitePWA(...)` for Android mode.
4. Keep the existing web `dist` output when no Android `--outDir` is supplied.
5. Define a non-secret runtime marker such as `VITE_APP_RUNTIME=android`.

Guard `InstallPrompt` and `PwaUpdatePrompt` in `frontend/src/App.jsx` so they do not mount on Android.

### Native project baseline

Configure:

- `minSdk` at the approved value, no lower than Capacitor 8 support.
- `compileSdk` and `targetSdk` at API 36 for the Play release timeline.
- Hardware acceleration enabled.
- Cleartext traffic disabled for release.
- Portrait orientation initially.
- Edge-to-edge compatible theme.
- Release WebView debugging disabled.
- Backup/data-extraction rules reviewed.
- Network security config with no permissive production exceptions.

### Verification

```powershell
npm --prefix ".\android app" run android:sync
Set-Location ".\android app\android"
.\gradlew.bat clean assembleDebug
adb install -r .\app\build\outputs\apk\debug\app-debug.apk
```

On device, verify:

- Splash to React app.
- Local packaged origin.
- No PWA install prompt.
- No PWA update prompt.
- No service worker registration.
- Offline relaunch reaches packaged shell.
- Existing web build still passes.

### Gate 1

Pass only when a clean debug APK installs and the web build remains unchanged in behavior.

### Rollback

- Delete generated `android app/android/` and `android app/www/` if initialization is wrong.
- Recreate only after confirming exact target paths.
- Revert mode guards if they alter the web build.

## Phase 2: Add the platform adapter and Android login UI

### Platform modules

Create guarded modules under `frontend/src/platform/`, for example:

```text
frontend/src/platform/index.js
frontend/src/platform/web.js
frontend/src/platform/android.js
frontend/src/platform/errors.js
frontend/src/platform/PlatformProvider.jsx
```

The browser adapter wraps current behavior. The Android adapter calls Capacitor plugins. Existing feature code receives the adapter through a hook or imported facade.

### Native login flow

1. Register the approved Android package in the existing Firebase project.
2. Add debug SHA-1 and SHA-256.
3. Enable Google provider if not already enabled.
4. Download the updated `google-services.json`.
5. Place it at `android app/android/app/google-services.json`.
6. Configure the native auth plugin for Google and Credential Manager.
7. On Android button press, invoke native Google sign-in with Credential Manager.
8. Extract the returned Google ID token.
9. Create a Firebase JS Google credential.
10. Call Firebase JS `signInWithCredential`.
11. Reuse existing `authService` profile creation/update logic.
12. Let the existing `onAuthStateChanged` listener in `App.jsx` establish Firestore listeners.
13. Process `pendingInviteCode` exactly as the current `useAuth.js` flow does.

### Login UI implementation

Keep the web `Login.jsx` design for web. Add an Android branch or component with:

- Phone-first single column.
- App brand and short explanation.
- One persistent Google button.
- Native progress indicator.
- Cancel-safe retry.
- Privacy policy and support links.
- Safe-area and keyboard correctness.
- Screen reader labels and 48 dp touch targets.

Do not automatically trigger Credential Manager every time React remounts. Automatic sign-in may be evaluated separately after explicit sign-in works reliably.

### Authentication test matrix

- First-time user, one account on device.
- First-time user, multiple accounts.
- Returning user.
- User cancels chooser.
- No Google account on device.
- Offline before chooser.
- Offline after credential selection.
- Debug SHA missing, to confirm error normalization.
- Sign out and select a different account.
- App killed while account UI is open, then restored.
- Uninstall and reinstall.
- User opened `/join/:code` before login.
- Suspended user and admin custom-claim behavior.

### Gate 2

Pass when native account selection produces a valid Firebase JS session and all protected Firestore reads work on at least two physical devices.

### Rollback

- Web adapter remains the default outside Android.
- Stop Android rollout if native auth fails.
- Do not fall back to `signInWithPopup` inside release WebView.

## Phase 3: Integrate back, lifecycle, system bars, and deep links

### Back coordinator

1. Install the Capacitor App plugin listener once.
2. Add a transient-surface registry.
3. Register `Modal`, bill scanner, sidebar, and menu dismiss handlers.
4. Add route-aware fallback rules.
5. Handle authenticated and unauthenticated roots.
6. Verify that replaced login routes do not return through history.
7. Use normal Android task behavior at root.
8. Avoid JavaScript edge-swipe detection.

### Unsaved form policy

Define which flows warn before back:

- Add expense after user input.
- Edit expense after mutation.
- Log entry editing.
- Profile editing.
- Bill scan review after parsed data.

The warning must be idempotent. A second back press should not stack dialogs.

### Lifecycle and restoration

Handle:

- `appStateChange`, pause, and resume.
- `appRestoredResult` for camera or external Activity results after process death.
- Firebase token refresh after resume where needed.
- Sensitive modal closure or state restoration according to product policy.
- Network recheck without launching duplicate Firestore listeners.

### System UI

- Enable edge-to-edge.
- Apply dark status/navigation bar icon policy.
- Add safe-area padding to header, bottom nav, onboarding footer, and full-screen modals.
- Verify three-button navigation and gesture navigation.
- Verify display cutout and rounded-corner devices.
- Verify keyboard resize/pan behavior with long forms.

### App Links

1. Confirm the HTTPS domain.
2. Add narrow intent filters.
3. Host `/.well-known/assetlinks.json`.
4. Add debug fingerprint only to a non-production test domain if needed.
5. Add Play signing fingerprint for production.
6. Parse `appUrlOpen` and cold launch URL.
7. Allowlist routes.
8. Test invite code preservation and unauthorized route fallback.

Test commands after package/domain configuration:

```powershell
adb shell am start -a android.intent.action.VIEW -d "https://EXAMPLE_DOMAIN/join/ABC123" APPROVED_PACKAGE_ID
adb shell am start -a android.intent.action.VIEW -d "https://EXAMPLE_DOMAIN/groups/TEST_GROUP" APPROVED_PACKAGE_ID
```

### Gate 3A

Back matrix passes for every route and transient surface in both Android navigation modes.

### Gate 3B

Cold and warm App Links route correctly, and back returns to a deterministic destination.

### Rollback

- Keep App Links additive; remove or narrow faulty intent filters in the next build.
- If a custom back handler regresses task behavior, restore Capacitor default handling while fixing the coordinator.

## Phase 4: Add native push and migrate Firebase tokens

### Firestore schema migration

Add `users/{uid}/devices/{installationId}` with owner-only rules. Use server timestamps where possible.

Migration sequence:

1. Deploy rules allowing authenticated users to manage only their own devices.
2. Update Cloud Functions to read both new device documents and legacy `fcmToken`.
3. Deploy and verify web notifications before any client writes new documents.
4. Update Android client to write its installation token.
5. Update web client later to write a web installation document while retaining the legacy field during transition.
6. Observe token and delivery counts.
7. Remove legacy reads only after an explicit adoption threshold and rollback window.

### Android client

- Create a random installation ID stored in app preferences.
- Request notification permission contextually on Android 13 and later.
- Register token after Firebase Auth is ready.
- Update document on token refresh, app update, login, and explicit re-enable.
- Delete or disable only current installation on logout.
- Create stable notification channels.
- Route foreground events to in-app UI without duplicate system notifications.
- Route notification taps from foreground, background, and killed states.

### Cloud Functions

Modify both direct and broadcast paths in `functions/index.js`:

- Query active tokens.
- Deduplicate.
- Batch within Admin SDK limits.
- Add Android payload and channel.
- Keep webpush payload.
- Delete only invalid installation documents.
- Keep structured aggregate logs.
- Apply retry policy only to retryable FCM errors.

### Push test matrix

- Android permission granted, denied, and later enabled in settings.
- Foreground notification.
- Background notification.
- Killed app notification.
- Notification tap to group, friends, activity, and dashboard.
- Logged-out device.
- User signed into two phones and one browser.
- Token refresh.
- App reinstall.
- Invalid token cleanup.
- Broadcast notification.
- Web push regression.

### Gate 4

Pass when Android and web receive the same applicable event without overwriting each other's token, and stale cleanup is installation-specific.

### Rollback

- Functions continue dual-read.
- Disable Android registration through a feature flag if needed.
- Keep additive device documents; they do not alter expense data.

## Phase 5: Make scanning, camera, files, share, and UPI native-safe

### Bill scan API

The current relative request is a release blocker.

Implement one approved path:

Path A, harden the Vercel endpoint:

- Add an explicit Android HTTPS URL.
- Send Firebase ID token.
- Verify token server-side with Firebase Admin.
- Add CORS for the packaged app request where required.
- Add rate limiting and payload limits.
- Keep Gemini key server-side.

Path B, move to an authenticated Firebase callable function:

- Port existing validation and Gemini call.
- Require `request.auth`.
- Preserve response schema.
- Remove duplicate endpoint only after both web and Android migrate.

Do not use both paths indefinitely.

### Camera and gallery

1. Test current HTML capture input on API 24, 29, 33, and 36.
2. Test process death while camera is open.
3. If inconsistent, move native mode to Camera or Photo Picker adapter.
4. Preserve orientation correction and current 1600 px compression behavior.
5. Avoid broad storage permissions.
6. Clear temporary receipt files after upload or cancellation.

### Export and share

- Replace native-mode object-URL downloads with Filesystem and Share adapter.
- Use MIME types and safe file names.
- Use app cache for temporary exports.
- Add cleanup policy.
- Test PDF, CSV, JSON, and settlement image sharing.
- Test cancellation and no-handler cases.

### UPI

- Test Google Pay, PhonePe, Paytm, BHIM, and no-handler fallback as available.
- Validate amount, payee VPA, payee name, and note before intent creation.
- Treat returned status as advisory unless independently verified.

### Gate 5

Scanner, camera, share, export, and UPI journeys pass on physical devices without broad storage permission.

### Rollback

- Feature-flag scanner or export action if its backend/native path fails.
- Preserve current web implementations for browsers.

## Phase 6: Performance and high-refresh work

### Establish device matrix

Minimum physical coverage:

- One API 24-28 class device or representative emulator with current WebView.
- One mid-tier 60 Hz physical phone.
- One 90 Hz or 120 Hz physical phone.
- One current API 36 device or emulator with Google Play services.
- Gesture navigation and three-button navigation.
- Small screen and large-font accessibility configuration.

### Baseline before optimization

Capture release-build measurements for:

- Cold, warm, and hot start.
- Dashboard scroll.
- Groups list and group detail.
- Expense form typing and split changes.
- Modal and scanner transitions.
- Analytics charts.
- Notification deep-link launch.

Record device, OS, WebView version, app version, display mode, thermal state, and network condition.

### Native configuration

- Confirm hardware acceleration.
- Confirm active display refresh mode during interaction.
- Let the scheduler select refresh by default.
- Add a preferred refresh-rate hint only if measured behavior is incorrectly capped.
- Do not switch refresh modes repeatedly.
- Keep debug overlays and WebView inspection out of release.

### Frontend optimization pass

Use profiler evidence to address:

- Large backdrop blurs on scrolling/fixed surfaces.
- `transition-all` where only color, transform, or opacity changes.
- Hover-only effects shipped to touch devices.
- Framer Motion initial animations repeated on route return.
- Chart animation and unnecessary dataset rebuilds.
- Large list rendering.
- Repeated derived balance calculations.
- Controlled-form rerender breadth.
- Firestore snapshot transformations on the main thread.
- Large image decode and canvas compression timing.

### Acceptance thresholds

- Cold interactive at most 2.5 seconds on reference mid-tier hardware.
- Warm interactive at most 1.0 second.
- At least 95 percent of frames within active refresh deadline in reference interactions after warm-up.
- No repeatable frozen frame over 700 ms.
- No sustained memory growth after soak cycles.
- No ANR in test runs.
- Touch feedback appears in the next frame.
- No application-imposed 60 Hz cap on a device actively running the app at 90 Hz or 120 Hz.

### Accessibility and reduced effects

- Respect reduced-motion preference.
- Keep functionality intact when animations are disabled.
- Test font scale at 1.0, 1.3, and 2.0 where practical.
- Test TalkBack focus order.
- Maintain 48 dp touch targets.

### Gate 6

Performance report includes before/after traces and all service-level objective results. A subjective "feels fast" approval is not enough by itself.

### Rollback

- Keep performance changes small and separately reviewable.
- Revert any optimization that changes balance, expense, auth, or routing behavior.
- Use a remote feature flag only for non-critical visual effects, not correctness.

## Phase 7: Security and production hardening

### Android hardening checklist

- `usesCleartextTraffic="false"` in release.
- WebView debugging off in release.
- No exported component without a documented external contract.
- Intent filters narrow to approved hosts and paths.
- No tokens or PII in Logcat.
- No secrets in `BuildConfig`, Vite environment, resources, APK, or AAB.
- Release signing values come from protected local/CI secret storage.
- R8 and resource shrinking tested.
- Backup and data extraction rules reviewed.
- Clipboard use reviewed for financial data.
- Screenshot/privacy-screen policy decided.
- Dependency audit and license review complete.

### Firebase hardening checklist

- Google provider and SHA fingerprints verified.
- Firestore rules emulator tests for device documents.
- Cloud Functions require auth for privileged calls.
- Scan endpoint verifies Firebase ID token.
- App Check Play Integrity registered.
- App Check monitoring reviewed before enforcement.
- Admin custom-claim behavior regression tested.
- Abuse and rate-limit paths tested.

### Play policy checklist

- Target API rechecked immediately before release.
- Data safety matches Firebase, Google auth, FCM, Gemini scanning, crash, and performance SDK behavior.
- Privacy policy is public and accurate.
- Account deletion request path is public and works.
- App access instructions provide reviewer credentials if any gated flow requires them.
- Content rating and target audience complete.
- Financial feature wording does not imply PayMatrix processes or guarantees payments if it only records expenses and launches UPI apps.

### Gate 7

Threat review, dependency audit, rules tests, release manifest review, and Play declarations are signed off.

### Rollback

- App Check enforcement can return to monitor mode.
- Backend changes remain additive until adoption is proven.
- Stop release for policy mismatch rather than hiding behavior from review.

## Phase 8: Signing and release artifacts

### Signing model

Use Play App Signing with separate keys:

- App signing key: held by Google Play.
- Upload key: held by the project owner and CI.
- Debug key: local development only.

Never commit keystores, passwords, signing property files, or exported private keys.

### Key handling

1. Generate the upload key in Android Studio or `keytool` using a modern RSA key.
2. Store the keystore outside the repository.
3. Store passwords in a password manager and CI secret store.
4. Make an encrypted offline backup.
5. Document custodian and recovery process.
6. Add upload certificate SHA-1 and SHA-256 to Firebase.
7. After Play App Signing is enabled, add Play app signing SHA-1 and SHA-256 to Firebase and App Links.

### Versioning

- `versionCode` increases for every uploaded APK/AAB, including test tracks.
- `versionName` uses semantic product versioning, for example `1.0.0`.
- Build metadata records Git commit and build time without exposing secrets.
- Web version and Android version may progress independently.

### Build commands

Debug APK:

```powershell
npm --prefix ".\android app" run android:apk
```

Release AAB after signing configuration:

```powershell
npm --prefix ".\android app" run android:aab
```

Expected artifact locations:

```text
android app/android/app/build/outputs/apk/debug/app-debug.apk
android app/android/app/build/outputs/apk/release/app-release.apk
android app/android/app/build/outputs/bundle/release/app-release.aab
```

### Artifact verification

- Install release APK on a physical device.
- Inspect package ID, version, signing certificate, permissions, exported components, and cleartext policy.
- Verify AAB with `bundletool` and Play Console pre-launch report.
- Run smoke tests on the exact signed release build.
- Archive checksums and provenance, not signing secrets.

### Gate 8

Signed release APK and AAB are reproducible from the tagged source and pass release smoke tests.

### Rollback

- Reset a compromised upload key through Play App Signing procedures.
- A lost app signing key outside Play App Signing may make updates impossible; this is why Play App Signing is mandatory.

## Phase 9: Test distribution and Play Console

### Internal testing

1. Create the Play app with the final package ID.
2. Complete minimum store setup.
3. Enable Play App Signing.
4. Upload the signed AAB to Internal testing.
5. Add owner and trusted testers.
6. Install from Play, not only through `adb`.
7. Add Play signing fingerprints to Firebase.
8. Re-test Google login and App Links from the Play-installed build.

### Closed testing

For personal developer accounts created after November 13, 2023, confirm current Play requirements. The current documented rule may require at least 12 opted-in testers for 14 continuous days before applying for production access.

Collect:

- Device and Android version.
- App version.
- Auth, push, scanner, expense, navigation, and performance outcomes.
- Crash and ANR reports.
- Tester feedback and changes made from it.

### Pre-launch report

Resolve or explicitly accept:

- Crashes and ANRs.
- Accessibility issues.
- Security warnings.
- Compatibility failures.
- Login automation limitations.
- Screenshot and layout issues.

### Store listing deliverables

- App name.
- Short and full description.
- 512 x 512 app icon.
- Feature graphic.
- Phone screenshots from release build.
- Category and tags.
- Support email and website.
- Privacy policy URL.
- Account deletion URL.
- Data safety form.
- Content rating.
- Target audience.
- App access/reviewer instructions.
- Release notes.

### Gate 9

Internal and required closed testing are complete, the pre-launch report is acceptable, and production access is approved.

### Rollback

- Pause a test track release.
- Upload last known-good code with a higher `versionCode`.
- Keep tester communication and known-issue notes current.

## Phase 10: Staged production rollout

### Rollout sequence

Recommended starting sequence, adjustable to user count and risk:

1. 5 percent for at least 24 hours.
2. 20 percent after metrics and core journeys are healthy.
3. 50 percent after another observation window.
4. 100 percent only after auth, crash, ANR, push, and scanner metrics remain within thresholds.

### Stop conditions

Pause rollout for any of:

- Material login failure increase.
- Crash or ANR regression above the agreed baseline.
- Data loss, duplicate expense, or authorization defect.
- Notification routing to the wrong user or route.
- Scanner endpoint security or availability incident.
- Repeatable startup blank screen.
- Severe jank on supported reference devices.

### Rollback procedure

1. Halt staged rollout.
2. Disable affected non-core feature through a pre-approved flag when safe.
3. Restore backend compatibility if the backend caused the incident.
4. Build last known-good app code with a higher `versionCode`.
5. Run release smoke tests.
6. Upload as a new Play release.
7. Document incident, scope, root cause, and prevention.

### Gate 10

Production reaches 100 percent only after monitored staged rollout and owner sign-off.

## Detailed functional acceptance matrix

| Area | Required cases |
| --- | --- |
| Install/update | Fresh install, update over previous Play build, offline first launch, reinstall |
| Auth | One account, multiple accounts, cancel, no account, offline, sign-out, switch account, revoked access |
| Routing | Every route in `App.jsx`, 404 fallback, protected redirect, admin claim, pending invite |
| Back | Every route, modal, drawer, scanner, unsaved form, task root, deep-link cold start |
| Layout | Gesture nav, three-button nav, cutout, keyboard, font scaling, TalkBack |
| Firestore | Online, offline cached read, offline queued write, reconnect, rules denial |
| Expense | Add, edit, split modes, validation, retry, group detail reconciliation |
| Push | Permission, foreground, background, killed, token refresh, multi-device, web regression |
| Scanner | Camera, gallery, multi-image, rotation, compression, timeout, unauthorized, backend error |
| Files | PDF, CSV, JSON, image share/open, cancel, no target app, cleanup |
| UPI | Multiple handlers, no handler, cancel, malformed data, advisory return status |
| Lifecycle | Background/resume, process death during external Activity, low memory, network change |
| Performance | Startup, scroll, route, form, charts, scanner, 60/90/120 Hz, thermal repeat |
| Release | Debug APK, release APK, AAB, signature, permissions, Play install, App Links |

## CI roadmap

The local build should work before CI is added.

Planned CI stages:

1. Install frontend and Android wrapper dependencies with `npm ci`.
2. Lint, unit test, and web build.
3. Build Android-mode web assets.
4. Validate assets.
5. `cap sync android` and fail on uncommitted generated native drift where policy requires it.
6. Run Android unit tests and lint.
7. Build debug APK on pull requests.
8. Build signed AAB only on protected tags or manual release workflow.
9. Upload mapping and private source maps to approved crash tooling.
10. Publish artifacts with checksums and retention policy.

CI secrets:

- Upload keystore as protected encrypted secret.
- Keystore password, key alias, and key password as separate secrets.
- Firebase service credentials only if a release task truly needs them.
- No secret exposed to pull requests from forks or printed in logs.

## Firebase changes to report to the owner

The following Firebase/backend changes are expected and should be communicated before implementation:

1. Register a new Android app in the existing Firebase project.
2. Add debug, upload, and Play App Signing SHA-1 and SHA-256 fingerprints.
3. Download and add the matching `google-services.json`.
4. Keep Google sign-in provider enabled.
5. Add per-installation device-token documents and Firestore rules.
6. Update notification Cloud Functions for multi-token web and Android delivery.
7. Add Android notification channel data and deep-link payloads.
8. Authenticate and expose the bill scan API to the packaged app, or migrate it to a callable function.
9. Register Play Integrity App Check and monitor before enforcement.
10. Add the Play signing fingerprint to `assetlinks.json` for verified App Links.

No expense, group, settlement, friend, log, or balance schema migration is required just to create the Android app.

## Final release checklist

### Repository

- Web and Android lockfiles committed.
- Generated `www/`, APKs, AABs, keystores, and local signing files ignored.
- Web lint, tests, and build pass.
- Android lint, tests, and release build pass.
- `git diff --check` passes.

### Runtime

- Native Google account chooser works in Play-installed build.
- Firebase JS session is valid.
- Back matrix passes.
- PWA prompts and service worker are absent.
- Push, deep links, scanner, files, and UPI pass.
- Offline and resume paths pass.
- Performance thresholds pass.

### Firebase/backend

- All signing fingerprints registered.
- Device-token rules deployed and tested.
- Functions dual-platform and monitored.
- Scan API authenticated.
- App Check staged safely.

### Security

- Release WebView debugging off.
- Cleartext off.
- No secret scan findings.
- Exported components reviewed.
- Signing backup verified.

### Play

- API target meets current policy.
- AAB signed and accepted.
- Pre-launch report resolved.
- Store listing complete.
- Privacy, Data safety, app access, deletion, rating, and audience complete.
- Required closed test complete.
- Staged rollout and rollback owners assigned.

## Suggested first implementation milestone

The safest first hands-on milestone is limited to:

1. Approve package ID and minimum SDK.
2. Install/verify Android Studio toolchain.
3. Create the separate Capacitor workspace.
4. Add Android-mode Vite output with PWA isolation.
5. Build and install a debug APK showing the existing unauthenticated app shell.
6. Re-run the web build and confirm no regression.

Native auth should begin only after that milestone is reproducible.
