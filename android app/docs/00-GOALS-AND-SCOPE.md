# PayMatrix Android App: Goals and Scope

## Document status

- Status: Planning baseline
- Scope of this change: Documentation only
- Repository: `C:\Users\1080p\Desktop\personal projects\PayMatrix`
- Android workspace: `android app/`
- Existing web workspace: `frontend/`
- Planned runtime: Capacitor 8 with a native Android project
- Planned minimum Android version: Android 7.0, API 24, subject to final product approval
- Planned Play target: API 36 for submissions on or after August 31, 2026

This document defines what the Android effort is trying to achieve, what it will not do, how success will be measured, and where work must stop for approval. It does not authorize code, Firebase, Play Console, or signing changes by itself.

## Repository facts that shape the plan

The current application is a React 19 and Vite 6 PWA under `frontend/`. It uses:

- React Router browser history in `frontend/src/main.jsx` and `frontend/src/App.jsx`.
- Firebase JavaScript SDK for Authentication, Firestore, Storage, Messaging, and Functions in `frontend/src/config/firebase.js`.
- Google web authentication through `signInWithPopup` in `frontend/src/services/authService.js`.
- Browser FCM through a service worker and VAPID key in `frontend/src/services/fcmService.js` and `frontend/public/sw.js`.
- A single `users/{uid}.fcmToken` field consumed by `functions/index.js`.
- PWA install and update UI through `InstallPrompt` and `PwaUpdatePrompt` in `frontend/src/App.jsx`.
- A relative `/api/scan-bill` request in `frontend/src/hooks/useBillScanner.js`, currently served by the Vercel function at `frontend/api/scan-bill.js`.
- Mobile navigation through `frontend/src/components/layout/BottomNav.jsx` and nested routes in `frontend/src/App.jsx`.
- IndexedDB-backed Firestore persistence and Redux persistence.
- Camera and gallery selection through HTML file inputs in `BillScannerModal.jsx`.
- Browser download and share behavior in `frontend/src/utils/exportUtils.js`, `GroupDetail.jsx`, and `SettleUpModal.jsx`.

These are reusable strengths, but native authentication, native push, Android back handling, app links, file sharing, and Play release signing need explicit Android integration.

## Product vision

Ship PayMatrix as a production Android app without turning the existing web project into an Android project. The Android app should reuse the proven React experience and Firebase data model while adding native Android behavior where the operating system expects it.

The intended result is:

1. The web/PWA continues to build, deploy, and update independently.
2. The Android app lives under `android app/` and owns Capacitor, Gradle, Android resources, native configuration, signing integration, and Play release artifacts.
3. Android consumes an Android-mode artifact produced by the existing Vite application.
4. Google sign-in uses the Android Credential Manager account chooser, not a web popup.
5. Android system back buttons and edge-back gestures behave consistently with route history and transient UI.
6. The app takes advantage of 60 Hz, 90 Hz, and 120 Hz displays without an application-imposed frame cap.
7. Debug APKs are installable for testing, and signed release AABs are suitable for Play Console.

## Goals

### G-01: Preserve web independence

The existing commands under `frontend/package.json`, including `npm run dev`, `npm run build`, and `npm run preview`, must retain their web behavior.

Success criteria:

- No generated Android project is placed under `frontend/`.
- A web build does not require Android Studio, a JDK, Gradle, Capacitor, or `google-services.json`.
- A web deployment does not include native-only code in its active runtime path.
- PWA installation, service worker updates, and web Google login continue to work in supported browsers.
- Android can be removed by deleting `android app/` plus narrow, platform-guarded frontend adapters without reconstructing the web app.

### G-02: Establish a separate, reproducible Android workspace

`android app/` will be the owner of the native project and native build process.

Success criteria:

- A clean checkout can create or restore the Android project with documented commands.
- `android app/package-lock.json` pins Capacitor and plugin versions separately from `frontend/package-lock.json`.
- `android app/www/` is generated and never treated as source.
- Capacitor copies only a verified production Vite artifact into the Android app.
- Debug and release builds are produced by Gradle wrapper commands checked into the Android workspace.

### G-03: Use native Google account selection

The Android login experience must use Google Credential Manager so users can select an account already present on the device. The existing browser `signInWithPopup` flow remains the web implementation.

Success criteria:

- Tapping the Android sign-in button opens the system Google account chooser or Credential Manager bottom sheet.
- Existing accounts and new users resolve to the same Firebase project and UID rules as the web app.
- The Google ID token is exchanged into the Firebase JavaScript Auth session used by the existing Firestore code.
- Cancel, no-account, offline, configuration, and revoked-credential states show actionable native-specific messages.
- Sign-out clears the Firebase session and Credential Manager state as required.
- Debug, upload, and Play App Signing SHA fingerprints are registered with Firebase before their corresponding builds are tested.

### G-04: Deliver Android-correct navigation and gestures

The system back button and edge-back gesture must operate through one back policy.

Back priority, from highest to lowest:

1. Dismiss the top dialog, bottom sheet, scanner, menu, or drawer.
2. Leave an in-progress focused sub-flow only after handling unsaved changes.
3. Navigate to the previous React Router history entry.
4. From a top-level tab reached through tab switching, return to the expected previous route or dashboard according to the navigation policy.
5. At the authenticated root, allow Android back-to-home behavior instead of looping or showing a web 404.
6. At login or onboarding root, allow Android back-to-home behavior.

Success criteria:

- Button navigation and gesture navigation pass the same test cases.
- No custom horizontal edge gesture competes with Android's system gesture region.
- Back never exits while a dismissible modal is visible.
- Back never returns an authenticated user to a stale login page.
- Deep-link entry has a defined back destination.
- Root back produces normal Android task behavior.

### G-05: Meet measurable responsiveness and frame pacing targets

"No lag anywhere" is treated as a measurable performance objective, not an untestable promise. Android and the display scheduler make the final refresh-rate decision, so the app must avoid imposing a lower cap and must stay within each active display mode's frame budget.

Frame budgets:

- 60 Hz: 16.7 ms per frame.
- 90 Hz: 11.1 ms per frame.
- 120 Hz: 8.3 ms per frame.

Initial performance service-level objectives:

- Warm app interactive time: at most 1.0 second on the reference mid-tier device.
- Cold app interactive time: at most 2.5 seconds, excluding an unavailable network service.
- Route transition response after tap: visual response in the next rendered frame.
- Scroll and gesture tests: at least 95 percent of frames meet the active display deadline after warm-up on the reference device.
- No repeatable frozen frame over 700 ms in the primary journeys.
- Memory remains stable across 20 route cycles and 10 scanner open/close cycles.
- Release build has hardware acceleration enabled and no WebView debugging.

Reference journeys:

- Launch to login.
- Native Google sign-in to dashboard.
- Dashboard scroll.
- Groups list to group detail.
- Add expense, split selection, and submit.
- Open and dismiss every major modal with system back.
- Bill scanner capture, parse, review, and return.
- Analytics chart interaction.
- Notification tap to destination route.

### G-06: Provide native push notifications without regressing web push

Success criteria:

- Android 13 and later request notification permission at a contextual point.
- Android FCM tokens are stored per installation, not in the current single-token field.
- One user can receive notifications on multiple Android devices and a web browser without tokens overwriting each other.
- Foreground, background, killed-state, and notification-tap flows are tested.
- Notification channels exist with stable IDs and user-readable names.
- Web push continues using the existing service worker path.
- Stale tokens are removed per installation without deleting valid tokens for other devices.

### G-07: Make Firebase and backend integration production-safe

Required Firebase work is in scope, but it must be staged and backward compatible.

Success criteria:

- A Firebase Android app is registered in the existing PayMatrix Firebase project.
- `google-services.json` corresponds exactly to the approved package ID.
- Google provider settings and all required SHA-1 and SHA-256 fingerprints are present.
- Firestore rules cover per-device push-token documents.
- Notification Cloud Functions send both web and Android payloads.
- `/api/scan-bill` has an absolute HTTPS endpoint for the packaged app, validates Firebase identity, and allows only approved origins or authenticated app clients.
- App Check with Play Integrity is evaluated and rolled out in monitor-first mode before enforcement.
- No secret is embedded in the Vite bundle, APK, AAB, or repository.

### G-08: Produce testable and publishable artifacts

Success criteria:

- `app-debug.apk` installs with `adb install` on a physical device.
- A signed release APK is available for controlled sideload testing when needed.
- A signed release AAB is generated for Play Console.
- `versionCode` is monotonically increasing and `versionName` follows the release policy.
- Release signing uses a protected upload key and Play App Signing.
- Internal testing, closed testing where required, staged rollout, crash monitoring, and rollback steps are documented and exercised.

### G-09: Preserve security, privacy, and data behavior

Success criteria:

- Firestore Security Rules remain the final authorization boundary.
- Admin access continues to depend on Firebase custom claims.
- Release WebView debugging and cleartext traffic are disabled.
- Exported Android activities, providers, receivers, and services are minimized and reviewed.
- Log output does not contain ID tokens, access tokens, user PII, receipt content, or Firebase configuration secrets.
- Play Data safety answers match actual SDK behavior and permissions.
- A privacy policy and account/data deletion path are available before production submission.

## In scope

- Separate Capacitor Android wrapper under `android app/`.
- Android-mode Vite build and deterministic asset copy.
- Platform detection and narrowly scoped shared frontend adapters.
- Android-specific login presentation.
- Native Google Credential Manager sign-in integrated with Firebase JS Auth.
- Android back button, edge-back gesture, task-root, and deep-link behavior.
- Edge-to-edge layout, system bars, keyboard, safe-area handling, and status/navigation bar contrast.
- Android FCM token lifecycle, notification channels, and notification routing.
- Android App Links for PayMatrix invite and supported application routes.
- Camera/gallery validation for bill scanning.
- Android-safe export, share, and file-opening behavior.
- Performance profiling, frame pacing, startup, memory, and network resilience.
- Debug APK, signed APK, release AAB, Play App Signing, and Play testing tracks.
- Firebase registration, token-schema migration, Cloud Function updates, rules changes, and API hardening needed by the Android app.
- Production runbooks and rollback procedures.

## Non-goals

- Rewriting PayMatrix in Kotlin, Jetpack Compose, Flutter, or React Native.
- Replacing the existing React pages, Redux slices, balance engine, or Firestore data model without a demonstrated Android blocker.
- Moving the existing web deployment into `android app/`.
- Loading the production website remotely inside a thin WebView. Production must package versioned local assets.
- Running the PWA service worker, PWA update prompt, or PWA install prompt inside the native app.
- Shipping iOS in this effort.
- Adding payments, subscriptions, ads, or unrelated product features.
- Guaranteeing a fixed 120 Hz mode on every phone. The operating system controls the final display mode.
- Requesting broad storage permissions when Android photo picker, camera, share sheet, or app-scoped storage is sufficient.
- Publishing directly to 100 percent production without internal testing and a staged rollout.

## Scope boundaries and ownership

| Area | Owner | Rule |
| --- | --- | --- |
| Web/PWA runtime | `frontend/` | Existing browser behavior remains canonical. |
| Native wrapper and Gradle | `android app/` | All Android generated and native files live here. |
| Generated Android web assets | `android app/www/` | Build output only; delete and regenerate at any time. |
| Shared business UI | `frontend/src/` | Reused by web and Android; platform branches must be narrow. |
| Platform interface | Planned guarded modules under `frontend/src/platform/` | Web adapter and native adapter expose one contract. |
| Firebase server behavior | `functions/`, `firestore.rules`, Firebase Console | Changes must remain backward compatible with web clients. |
| Vercel scan endpoint | `frontend/api/scan-bill.js` | Must support authenticated Android requests over HTTPS. |
| Release credentials | Outside Git and Play Console | Never stored in source control or generated web assets. |

## Required product decisions before implementation

These are gates, not assumptions to hide in code:

1. Android application ID is implemented as `com.paymatrix.app`. Confirm this exact ID before the first Play Console app is created because the Play package name is effectively permanent after publication.
2. Minimum Android version. The technical baseline is API 24; product may choose a higher minimum based on device analytics.
3. Canonical HTTPS domain for Android App Links. Candidate: the production PayMatrix domain, but ownership and `assetlinks.json` hosting must be confirmed.
4. Play Console account type and creation date. New personal accounts may require a closed test before production access.
5. Privacy policy URL, support email, app category, target audience, and account deletion URL.
6. Final application display name and store listing name.
7. Whether admin routes are included in the mobile build or intentionally unavailable on phones.
8. Whether native push and bill scanning are required for the first internal-test build or may land in the next gated phase.

## Phase gates

### Gate 0: Decisions locked

Pass conditions:

- Application ID, display name, minimum SDK, App Link domain, and Play account are confirmed.
- A Firebase project owner is available for Android app registration.
- No unreviewed naming decision is embedded in generated Android files.

### Gate 1: Wrapper boots

Pass conditions:

- Clean Android workspace can build and install a debug APK.
- Packaged local Vite assets render without a remote `server.url`.
- Web build remains green.
- PWA-only UI and service worker do not run in Android.

### Gate 2: Native identity works

Pass conditions:

- Credential Manager account selection works on two physical devices.
- Firebase JS Auth receives the signed-in user.
- Existing and new user Firestore profile paths work.
- Cancel, retry, sign-out, reinstall, and token refresh pass.

### Gate 3: Navigation and native surfaces work

Pass conditions:

- Back policy passes for routes, modals, scanner, drawers, onboarding, login, and task root.
- Keyboard and safe-area tests pass in gesture and three-button navigation.
- Invite links and notification links reach the expected route.
- Camera, gallery, share, export, and UPI intents have tested fallbacks.

### Gate 4: Backend and push are dual-platform

Pass conditions:

- Per-installation token schema is deployed with dual-read compatibility.
- Web push regression suite passes.
- Android push works foreground, background, and killed.
- Bill scan requests are authenticated and work from the packaged origin.

### Gate 5: Performance release candidate

Pass conditions:

- Performance service-level objectives pass on the agreed device matrix.
- Release build has no WebView debug flag, no cleartext traffic, and no debug Firebase configuration.
- Crash-free internal test and memory soak thresholds pass.

### Gate 6: Play production ready

Pass conditions:

- Signed AAB passes Play pre-launch report.
- Store listing, privacy, Data safety, content rating, app access, and account deletion declarations are complete.
- Required closed testing is complete.
- Staged rollout and rollback owners are named.

## Risk register

| ID | Risk | Impact | Prevention | Detection | Rollback |
| --- | --- | --- | --- | --- | --- |
| R-01 | Native Firebase user and Firebase JS user diverge | Firestore permission failures after login | Use native account chooser only to obtain Google credentials, then sign in the existing JS Auth instance | Assert `auth.currentUser.uid` before protected routing | Disable Android auth release and restore previous AAB |
| R-02 | Single `fcmToken` overwrites another device | Missing notifications on web or another phone | Migrate to per-installation token documents | Multi-device push test and token audit | Keep old field dual-read until migration is proven |
| R-03 | PWA service worker caches native assets | Stale UI after app update | Disable PWA plugin and prompts in Android build mode | Inspect WebView service workers and update test | Regenerate assets with native mode; ship higher `versionCode` |
| R-04 | Relative scan API points to `https://localhost` | Bill scanner always fails in APK | Use explicit HTTPS API base and authenticated request | End-to-end scanner test on release build | Feature-flag scanner off while backend is corrected |
| R-05 | Wrong SHA fingerprint | Google login returns developer/configuration error | Register debug, upload, and Play signing fingerprints | Test each signing channel independently | Add fingerprint, refresh config, issue a new build |
| R-06 | Browser-history back exits unexpectedly | Data loss or poor navigation | Central back coordinator and modal registry | Automated route matrix plus manual gesture test | Revert to Capacitor default handler for affected release |
| R-07 | Blur, charts, and broad transitions miss high-refresh deadlines | Visible jank and battery drain | Profile first; animate transform/opacity; reduce costly blur and rerenders | Macrobenchmark, Perfetto, WebView tracing | Disable expensive motion through a native performance flag |
| R-08 | App ID changes after publication | Cannot update existing Play listing | Lock package name at Gate 0 | Build and Firebase config validation | No technical rollback; create a new Play app only as last resort |
| R-09 | Signing key is lost or committed | Release compromise or blocked updates | Play App Signing, separate upload key, encrypted backup, Git ignore | Secret scan and release checklist | Reset upload key through Play; rotate affected credentials |
| R-10 | Backend migration breaks web | Existing users lose push or scanning | Additive schema, dual-read, dual-send, staged enforcement | Web production smoke test and function metrics | Redeploy previous function/rules while retaining additive data |
| R-11 | WebView behavior differs by Android version | Device-specific crash or input bug | API 24 through current device matrix and updated WebView requirement | Firebase Test Lab and physical device testing | Raise minimum WebView message or block affected feature |
| R-12 | Play policy changes during implementation | Submission rejection | Re-check policy at release gate, not only at project start | Play Console pre-launch and policy status | Delay production; continue internal testing |

## Rollback strategy

### Web rollback

- Android work must not change the web deployment pipeline.
- Any shared frontend adapter must default to the current web implementation outside Capacitor.
- A failing Android branch can be reverted without reverting unrelated web work.

### Android code rollback

- Tag every internal, closed, and production candidate.
- Keep the last known-good signed AAB source commit reproducible.
- Android rollback on Play means shipping the last known-good code with a new, higher `versionCode`; Play does not permit version-code downgrade.
- Halt or reduce a staged rollout immediately when crash, ANR, auth, or data-loss thresholds are exceeded.

### Firebase rollback

- Use additive schema changes first.
- During token migration, Cloud Functions read both `users/{uid}.fcmToken` and `users/{uid}/pushTokens/*`.
- Do not delete the legacy field until web and Android clients have crossed the agreed adoption threshold.
- Deploy rules after emulator tests and retain the previous rules commit for immediate redeploy.
- Enable App Check enforcement only after monitoring valid traffic and registering debug/test tokens.

### Authentication rollback

- Keep web `signInWithPopup` untouched for browsers.
- Native authentication is selected only when the verified Capacitor Android runtime is active.
- If native auth is defective, stop rollout. Do not silently open an unreliable OAuth popup inside WebView as a production fallback.

### Data rollback

- No destructive Firestore migration is required for the Android wrapper.
- New device-token documents may remain harmless if Android rollout is stopped.
- Any cleanup job must be separately reviewed, dry-run, logged, and reversible from export or backup.

## Definition of done

The Android goal is complete only when all of the following are true:

- The web build and Android build are separate and reproducible.
- Native Google account selection works with the existing Firebase authorization model.
- Back buttons and gestures pass the navigation matrix.
- Native push, deep links, bill scanning, camera, share, and export paths pass on physical devices.
- Performance targets pass on the agreed 60 Hz and high-refresh devices.
- Security, privacy, and Play declarations match the actual app.
- A debug APK is available for direct testing.
- A signed AAB is accepted by Play internal testing.
- Required closed testing and pre-launch checks pass.
- A staged production rollout has monitoring and a tested rollback owner.

## Related documents

- `01-ARCHITECTURE.md`: Target technical design and ownership boundaries.
- `02-IMPLEMENTATION-ROADMAP.md`: Ordered implementation, test, Firebase, and Play release steps.
