# PayMatrix Android Testing Strategy

## Purpose

This document defines the test plan for the separate PayMatrix Android application. It covers the
native shell, embedded React experience if used, Firebase integration, native Google sign-in,
notifications, system navigation, performance, and release artifacts.

Testing is risk-based. PayMatrix calculates and stores real shared expenses, so financial correctness,
authorization, duplicate-write prevention, and recoverable drafts are release blockers.

## Test Environments

Maintain three Firebase-aware environments before production launch:

| Environment | Purpose | Data policy | Distribution |
| --- | --- | --- | --- |
| Local/emulator | Fast development and security-rule tests | Synthetic only | Local debug APK |
| Staging | End-to-end QA with real Android services | Test users and test groups only | Firebase App Distribution or Play internal |
| Production | Final smoke and live users | Production data | Play tracks |

Do not point routine automated tests at the production Firebase project. The existing default project is
`paymatrix-174b5`; a separate staging Firebase project is strongly recommended before automation.

Each environment needs its own Android Firebase configuration, OAuth client, app ID, FCM token space,
and clearly visible app label or build suffix. Never copy a production service-account private key into
the Android repository or test artifact.

## Test Layers

### 1. Existing web logic tests

Continue running the independent frontend checks. The current repository has Vitest coverage for
`frontend/src/utils/balanceEngine.test.js`, including split modes, debt simplification, settlements,
deleted expenses, rounding, and conservation of money.

Baseline commands from the repository root:

```powershell
Set-Location frontend
npm ci
npm run lint
npm run format:check
npm test
npm run build
```

The Android effort must not weaken or replace the existing web build. Add tests for every financial bug
before fixing it, especially rounding, retry, offline replay, and duplicate submissions.

### 2. Native unit tests

Add local JVM tests for native-only logic:

- mapping native Google credentials to Firebase auth results;
- auth cancellation and error mapping;
- native-to-web bridge message validation;
- route and deep-link allowlists;
- Back handling state precedence;
- version and environment selection;
- notification payload parsing;
- secure-storage wrappers; and
- serialization of saved draft state.

Bridge messages must be treated as untrusted input. Test missing fields, unexpected types, oversized
payloads, unknown action names, invalid URLs, and repeated response IDs.

### 3. Android instrumentation tests

Use AndroidX Test and Espresso for the host Activity and native screens. For a WebView build, use
Espresso Web for stable DOM-level assertions only where needed; prefer user-visible outcomes over CSS
selectors tied to styling.

Automate at minimum:

- cold launch to native login;
- successful native Google credential handoff using a testable auth abstraction;
- login cancel and retry;
- auth restoration after Activity recreation;
- deep link `/join/:code` before and after login;
- dashboard root Back to home;
- nested route Back;
- dirty expense form discard confirmation;
- keyboard visibility and submit action;
- process recreation with a saved draft;
- offline cached launch and reconnect;
- notification tap routing; and
- rejection of external or malformed navigation URLs.

Do not attempt to automate the real Google account chooser with hard-coded production credentials.
Use a fake auth implementation for deterministic instrumentation tests and retain manual physical-device
coverage for the actual chooser.

### 4. Firebase emulator and rules tests

Run Firestore security-rule tests for every cross-user path. Verify:

- unauthenticated users cannot read or write PayMatrix data;
- group members can read only groups they belong to;
- users cannot forge membership, balances, settlements, admin flags, or another user's notifications;
- cross-user notification creation goes through Cloud Functions;
- admin access depends on custom claims;
- retries do not create duplicate financial records; and
- account deletion removes or anonymizes data according to the product policy without corrupting other
  members' historical balances.

Cloud Functions should be tested against emulator data for success, permission denial, timeout, retry,
invalid payload, missing index, and stale FCM token cases.

### 5. End-to-end tests

Run end-to-end tests against staging on a small set of emulators and physical devices. Cover complete
user journeys, not every visual permutation:

1. New user launches, completes onboarding, chooses a device Google account, and reaches dashboard.
2. User opens an invite link while signed out, signs in, and joins the intended group exactly once.
3. User creates a group, adds members, records equal/exact/percentage/share/itemized expenses, and all
   participants observe matching balances.
4. User settles a debt, backgrounds the app during save, resumes, and sees one settlement.
5. User works offline, creates or edits supported data, reconnects, and reaches a consistent state.
6. User receives a native FCM notification in foreground, background, and terminated states; tapping it
   opens the intended authorized destination.
7. User signs out; native and web tokens are cleared and Back cannot reopen authenticated content.

## Required Device Matrix

Use emulators for breadth and physical hardware for auth, OEM behavior, refresh rate, thermal behavior,
notifications, camera/document flows, and Play-delivered builds.

| Class | Minimum coverage | Navigation/display focus |
| --- | --- | --- |
| Low-tier phone | Android 10 or 11, 3-4 GB RAM, 60 Hz | Three-button Back, slow CPU/storage, memory pressure |
| Mid-tier phone | Android 13 or 14, 6 GB RAM, 90 Hz | Gesture Back, common real-world baseline |
| Current reference phone | Android 15, 120 Hz | Edge-to-edge, predictive Back, high refresh |
| Latest API emulator/device | Android 16/API 36 | Current Play target behavior and regressions |
| Samsung device | Current supported One UI | OEM keyboard, notification, task and WebView behavior |
| Small screen | About 360 x 640 dp | Keyboard, font scale, compact actions |
| Tablet | 8-11 inch, landscape and portrait | Resizable layout, taskbar, multi-window |
| Foldable emulator/device | Fold/unfold and tabletop where available | Configuration change, continuity, hinge bounds |

For every release candidate, test at least one physical low/mid-tier phone, one current physical phone,
and the latest API emulator. Before production, add a Play internal-track install on a device that has
never sideloaded the app.

Run critical navigation tests twice on capable phones: once with gesture navigation and once with
three-button navigation. Change navigation mode in Android system settings rather than simulating only
a key event.

## Manual Test Suites

### Install, upgrade, and launch

- [ ] Fresh debug APK install launches the correct non-production environment.
- [ ] Fresh Play internal-track install is signed by Play and launches without a blank screen.
- [ ] Upgrade from the previous production candidate preserves auth, preferences, onboarding state, and
      compatible cached data.
- [ ] Downgrade is not treated as a supported recovery path.
- [ ] Cold start, warm start, notification start, deep-link start, and launcher restart all reach a
      deterministic screen.
- [ ] Force stop and relaunch do not duplicate Firestore writes or listeners.
- [ ] Clearing app storage returns to a true first-run state.
- [ ] App works when Android System WebView/Chrome updates between launches.

### Native Google login

- [ ] Login screen is Android-specific and does not expose the web `signInWithPopup` UI.
- [ ] Tapping Continue with Google opens the device account chooser.
- [ ] Existing device accounts display correctly; selecting one authenticates with Firebase.
- [ ] Cancel returns to a usable login screen without an error toast implying failure.
- [ ] No accounts/add-account path returns safely.
- [ ] Offline, captive portal, timeout, revoked consent, disabled account, and provider-disabled errors
      produce useful retry behavior.
- [ ] Rapid repeated taps launch one chooser and create one session.
- [ ] Debug, upload, and Play app-signing certificate fingerprints are accepted.
- [ ] First login creates the expected `users/{uid}` document; returning login updates profile fields
      without clearing `friends`.
- [ ] Login after an invite resumes `pendingInviteCode` behavior and joins the correct group.
- [ ] Sign-out revokes local app access, removes native FCM association, and returns to native login.

### System Back and gestures

- [ ] Back closes keyboard before leaving a form.
- [ ] Back closes modal, drawer, sheet, picker, and menu before changing route.
- [ ] Dirty form prompts once; cancel preserves every value; discard leaves once.
- [ ] Back from nested group/expense/profile routes returns to the logical previous route.
- [ ] Back at dashboard root performs Android back-to-home.
- [ ] Predictive Back preview matches the actual destination and cancellation restores the screen.
- [ ] Three-button Back, gesture Back from left edge, and gesture Back from right edge agree.
- [ ] App gestures do not block system edges, scrolling, sliders, or accessibility services.
- [ ] Every swipe action has a visible tap alternative and destructive actions require confirmation.

### Edge-to-edge and safe areas

- [ ] Status bar icons are visible in light and dark themes.
- [ ] Header content clears cutouts and rounded corners.
- [ ] Bottom navigation, FABs, snackbars, and final list rows clear gesture and three-button bars.
- [ ] Full-screen dialogs and sheets handle their own insets.
- [ ] No layout jumps when system bars show/hide or navigation mode changes.
- [ ] Content remains usable in split-screen, freeform window, tablet taskbar, and picture-in-picture return
      if any external activity used it.

### Keyboard and forms

- [ ] Test Gboard and one OEM keyboard in portrait and landscape.
- [ ] Focused field, error text, and submit action remain visible.
- [ ] Next/Done actions move focus or submit once as intended.
- [ ] Decimal amount entry supports the target locales and rejects invalid values clearly.
- [ ] Paste, select, autofill, voice input, emoji in names, and password-manager overlays do not break UI.
- [ ] Keyboard Back, system Back, and tap outside have consistent behavior.
- [ ] Rotation with keyboard open preserves the form and does not duplicate saving.
- [ ] Test font scales 100, 130, and 200 percent and display sizes default and large.

### Orientation and lifecycle

- [ ] Rotate every core screen in both directions.
- [ ] Enter/exit split-screen and resize continuously while a form is dirty.
- [ ] Fold/unfold while viewing dashboard, group detail, and a draft expense.
- [ ] Enable Developer Options > Don't keep activities and complete a core journey.
- [ ] Background for 30 seconds and 15 minutes; return to the same safe state.
- [ ] Revoke notification permission and Google access while app is backgrounded; resume safely.
- [ ] Receive a phone call/lock screen interruption while saving and while account chooser is visible.

### Data, offline, and concurrency

- [ ] Airplane-mode cached launch shows existing data and a truthful offline state.
- [ ] Offline write behavior matches the documented product policy and reconciles on reconnect.
- [ ] Two devices edit the same group and converge without silent loss.
- [ ] Repeated save taps, network retries, process death, and notification replay create one logical write.
- [ ] Currency rounding remains consistent with existing balance engine tests.
- [ ] Sign-out while offline does not expose cached authenticated content on next launch.
- [ ] Empty, loading, permission-denied, missing-index, and server-error states have recovery actions.

### Notifications and deep links

- [ ] Android 13+ notification permission is requested in context, not automatically at first frame.
- [ ] Notification channels have stable IDs, user-facing names, and appropriate importance.
- [ ] Foreground notification is shown in-app without duplicate system notification.
- [ ] Background and terminated notification taps route correctly after auth restoration.
- [ ] A notification for inaccessible/deleted data falls back safely.
- [ ] FCM token refresh updates the device record; logout removes only the current device token.
- [ ] Multiple devices per user can receive notifications without overwriting one `fcmToken` field.
- [ ] App Links reject untrusted hosts and invalid invite codes.

### Accessibility

- [ ] TalkBack can complete login, create expense, settle debt, and sign out.
- [ ] Focus order follows visual order and returns after dialogs.
- [ ] Controls have names, roles, states, and 48 dp touch targets.
- [ ] Color is not the only indicator for positive/negative balances or validation.
- [ ] Reduced motion is respected; animations are not required to understand state.
- [ ] High contrast, dark theme, font scaling, and switch access remain usable.

### Security and privacy

- [ ] Release WebView debugging is disabled.
- [ ] Only HTTPS and allowlisted PayMatrix/deep-link origins open inside the app.
- [ ] `javascript:` URLs, file access, mixed content, and unexpected bridge messages are rejected.
- [ ] Screenshots/recents policy is explicitly decided for sensitive screens; do not blanket-disable it
      without product approval.
- [ ] Tokens, keys, email addresses, expense details, and notification payloads are absent from logs.
- [ ] Rooted/emulated device behavior follows policy without making unsupported security promises.
- [ ] Account deletion and data export paths work and are discoverable.

## Performance Test Procedure

Use the profiling process in `05-PERFORMANCE-AND-UX.md`. For each candidate, capture:

- cold and warm launch time;
- time from Google account selection to authenticated dashboard;
- time to first cached dashboard content and fresh synchronized content;
- expense save response and sync completion;
- frame timeline for dashboard, group detail, activity, and charts;
- JavaScript long tasks and WebView memory growth;
- native main-thread stalls, GC, CPU, memory, network, battery, and thermal state; and
- Android vitals from the internal/closed track once data is available.

Repeat core scrolling at 60, 90, and 120 Hz where supported. A device dropping refresh rate while
content is static is normal; visible touch/scroll jank during active interaction is not.

## APK and AAB Verification

APK is for direct local testing. AAB is the Play publishing artifact. Test both paths:

```powershell
Set-Location "android app"
./gradlew.bat clean test lint assembleDebug
./gradlew.bat assembleRelease bundleRelease
```

Before trusting an artifact:

```powershell
adb install -r .\app\build\outputs\apk\release\app-release.apk
adb shell dumpsys package APPLICATION_ID
```

For the AAB, upload to the Play internal track or Internal App Sharing, install the Play-generated
split APKs, then rerun login, deep link, notification, and update tests. A locally installed universal
APK does not prove that Play signing and split delivery are correct.

Record checksums for artifacts retained outside CI:

```powershell
Get-FileHash .\app\build\outputs\bundle\release\app-release.aab -Algorithm SHA256
```

Replace `APPLICATION_ID` only after the permanent package name is selected.

## Release Candidate Evidence

Every release candidate must have one immutable record containing:

- Git commit and clean/dirty status;
- version name and version code;
- application ID, environment, target SDK, min SDK, Gradle and JDK versions;
- AAB SHA-256 and CI run URL;
- automated test, lint, security-rule, and build results;
- tested device/OS/WebView/navigation-mode list;
- manual test checklist owner and date;
- known issues and explicit acceptance owner;
- Crashlytics test event confirmation; and
- Play track and rollout percentage.

## Exit Criteria

- [ ] Existing frontend lint, tests, and build pass.
- [ ] Native unit, instrumentation, emulator/rules, and end-to-end suites pass.
- [ ] All critical manual suites pass on required physical devices.
- [ ] No open P0/P1 defect; no unexplained financial mismatch, duplicate write, crash, ANR, auth failure,
      data exposure, or broken Back path.
- [ ] Performance gates in `05-PERFORMANCE-AND-UX.md` pass in a release build.
- [ ] Play-delivered internal build passes smoke testing.
- [ ] Data Safety, privacy policy, account deletion, app access, and store declarations match the actual
      release binary and backend behavior.
- [ ] Rollback/forward-fix owner is available during rollout.

## References

- [Android test fundamentals](https://developer.android.com/training/testing/fundamentals)
- [Test WebView with Espresso Web](https://developer.android.com/training/testing/espresso/web)
- [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Play internal testing](https://support.google.com/googleplay/android-developer/answer/9845334)
