# PayMatrix Android Operations and Troubleshooting

## Purpose

This runbook covers day-two operation of the PayMatrix Android app: build environment, test
distribution, crash/ANR monitoring, release health, incident response, rollback, and common failures.
It assumes the Android app remains separate from the web PWA while sharing compatible Firebase data and
Cloud Functions.

## Current Workstation Baseline

Checked on August 4, 2026:

- `adb` is installed at `C:\Program Files\platform-tools\adb.exe`, version 37.0.0.
- `java -version` resolves to Java 8 (`1.8.0_471`).
- `JAVA_HOME`, `ANDROID_HOME`, and `ANDROID_SDK_ROOT` were not present in the current shell environment.
- No Android Gradle project exists yet under `android app`; this directory currently contains docs only.

Before attempting an Android build, install current Android Studio and use its supported bundled JDK,
or install the exact JDK required by the selected Android Gradle Plugin. Confirm with:

```powershell
java -version
adb version
Get-ChildItem Env:JAVA_HOME,Env:ANDROID_HOME,Env:ANDROID_SDK_ROOT -ErrorAction SilentlyContinue
```

Prefer the Gradle wrapper committed by the future Android project. A global Gradle installation is not
required and must not override the wrapper version.

## Operational Ownership

Assign named owners before production:

| Area | Owner responsibility |
| --- | --- |
| Android release | Build, signing, Play tracks, versioning, artifact ledger |
| Firebase/backend | Auth, Firestore rules/indexes, Functions, FCM, migrations |
| Privacy/policy | Privacy policy, Data Safety, deletion requests, retention |
| Incident commander | Severity, communication, rollout halt, recovery decision |
| Support | User reports, reproducible details, status updates |

Protect Play Console, Firebase Console, Google Cloud, CI, signing vault, and domain accounts with 2-Step
Verification and least privilege. Review access quarterly and immediately after a team member leaves.

## Build and Release Ledger

Keep one append-only release record per version code:

- version name and version code;
- Git commit and branch;
- application ID and Firebase app ID;
- build/target/min SDK, JDK, Gradle, Android Gradle Plugin, and dependency lock state;
- CI run and test evidence;
- AAB/APK SHA-256;
- upload certificate SHA-256;
- mapping/symbol artifact locations;
- Firebase/Functions/rules/schema version required by the app;
- Play track, countries, rollout percentage, and timestamps;
- known issues and acceptance owner; and
- rollback/forward-fix commit and operator.

Do not store passwords, access tokens, private keys, production user data, or `google-services.json`
contents in the ledger.

## Routine Build Diagnostics

From the future Android directory:

```powershell
Set-Location "C:\Users\1080p\Desktop\personal projects\PayMatrix\android app"
.\gradlew.bat --version
.\gradlew.bat tasks
.\gradlew.bat clean test lint assembleDebug
```

Useful device checks:

```powershell
adb devices -l
adb shell getprop ro.build.version.release
adb shell getprop ro.build.version.sdk
adb shell dumpsys package APPLICATION_ID
adb logcat -c
adb logcat
```

Use a dedicated test device/account for verbose logs. Before attaching logs to an issue, remove email
addresses, names, invite codes, group/expense data, auth tokens, FCM tokens, and URLs containing secrets.

## Firebase App Distribution (Optional)

Firebase App Distribution is useful for rapid APK testing before or alongside Play internal testing.
It does not replace testing a Play-signed build, Play split delivery, or track promotion.

### Setup

1. Register the Android app in the intended Firebase project.
2. Create tester groups such as `android-internal` and `android-qa`.
3. Install and authenticate Firebase CLI in a secure developer or CI environment.
4. Grant CI a narrowly scoped credential; do not store a service-account JSON in the repository.
5. Build a release-equivalent APK pointing to staging, with Crashlytics enabled for that environment.

Example manual distribution:

```powershell
firebase appdistribution:distribute `
  .\app\build\outputs\apk\release\app-release.apk `
  --app FIREBASE_ANDROID_APP_ID `
  --groups "android-internal,android-qa" `
  --release-notes-file .\release-notes.txt
```

CI should derive notes from the release record, upload only after tests pass, and output the tester link
without exposing credentials. Testers must confirm version code, environment label, and install source
before reporting a result.

Use APK distribution for predictable direct installs. AAB testing through App Distribution depends on
its Play integration; final approval still requires installing the exact artifact through the intended
Play track.

Official reference: [Firebase App Distribution](https://firebase.google.com/docs/app-distribution).

## Crash, ANR, and Performance Monitoring

### Crashlytics

Add the native Firebase Crashlytics Android SDK to the Android project and upload mapping/symbol files
for every release. Link Crashlytics with Google Play so issues can be filtered by Play track.

Required verification before launch:

1. Trigger a controlled test crash in a non-production-only path.
2. Restart the app so the report uploads.
3. Confirm project, app ID, version name/code, device, stack trace, and mapping are correct.
4. Remove or permanently gate the crash trigger from production UI.
5. Record nonfatal native bridge/auth exceptions without tokens or financial payloads.

Crashlytics automatically reports native/JVM crashes and ANRs when configured. JavaScript exceptions
inside a WebView are not automatically equivalent to native crashes. Add a bounded, redacted JavaScript
error reporting path or another approved monitoring SDK, then correlate web route/build ID with the
native release. Never pass full Redux state, Firestore documents, or DOM contents into Crashlytics.

Recommended custom keys, with no personal data:

- app environment;
- Android version and WebView major version;
- release commit/build ID;
- current route name, using a fixed allowlisted label;
- auth state as signed-in/signed-out only;
- launch source as launcher/deep-link/notification; and
- last bridge action name, not its payload.

Official reference: [Crashlytics for Android](https://firebase.google.com/docs/crashlytics/android/get-started).

### ANRs

Monitor both Crashlytics and Play Android vitals. For every ANR:

- identify version code, Play track, device/OS/WebView, foreground screen, and main-thread stack;
- correlate with Functions latency, Firestore errors, memory pressure, and release changes;
- reproduce in a release build on the slowest supported device;
- capture Perfetto/system trace when repeatable; and
- fix main-thread disk/network/JSON/bridge work instead of extending timeouts.

Never perform synchronous Firebase calls, token refresh, keystore operations, large serialization, or
WebView JavaScript evaluation waits on the main thread.

### Performance Monitoring

Native Firebase Performance Monitoring can measure app startup, native network behavior, and custom
traces when configured. It does not remove the need for Chrome DevTools/WebView traces and Android
Studio/Perfetto profiling.

Create privacy-safe traces around:

- cold start to first stable surface;
- native Google account selection to Firebase session;
- authenticated session to first cached dashboard content;
- first cached content to synchronized content;
- open group detail;
- save expense/settlement; and
- notification tap to destination.

Avoid user IDs, group IDs, email addresses, invite codes, amounts, or free text in trace names and
attributes. Use fixed categories and coarse success/error codes.

## Health Dashboard and Release Thresholds

Monitor at minimum:

- crash-free users and sessions by version/track;
- ANR rate and top clusters;
- excessive wakeups, background work, startup, rendering, and other Android vitals;
- native and JavaScript fatal/nonfatal errors;
- Google sign-in starts, cancels, successes, and categorized failures;
- notification permission grant, FCM registration, send failure, and open rates where consent permits;
- Cloud Function error/latency/retry rates;
- Firestore permission-denied, unavailable, resource-exhausted, and missing-index errors;
- expense/settlement duplicate-prevention events; and
- support reports per active user.

Set numeric stop/go thresholds after internal and closed testing establish a baseline. Until then, halt
a rollout immediately for any confirmed data exposure, financial corruption, account crossover,
widespread login failure, unrecoverable launch failure, signing/update failure, or rapidly rising
crash/ANR cluster.

Do not wait for a statistically neat dashboard when a severe issue is reproducible.

## Incident Severity

| Severity | Examples | Immediate response |
| --- | --- | --- |
| P0 | Data exposure, account crossover, destructive balance corruption, compromised signing/backend key | Halt rollout, disable affected feature/backend path, rotate/revoke as needed, incident process |
| P1 | Widespread crash/ANR, login unavailable, duplicate expenses, app cannot launch/update | Halt rollout, rollback backend if safe, prepare forward fix |
| P2 | Major feature broken with workaround, device/OEM-specific regression | Pause promotion, scope affected devices, fix next candidate |
| P3 | Cosmetic or low-impact defect | Track and prioritize normally |

For P0/P1, preserve evidence and timestamps. Do not delete logs or overwrite release artifacts during the
incident. Communicate confirmed facts, affected versions, workaround, and next update time.

## Rollback and Forward Fix

### Android artifact

Play releases cannot normally be rolled back by uploading an older artifact with a lower version code.
Use this order:

1. Halt or pause the active staged rollout in Play Console.
2. If possible, keep unaffected users on the previous version.
3. Revert to known-good source behavior in a new branch/commit without rewriting history.
4. Build with a new, higher version code.
5. Run the focused regression suite plus all release blockers.
6. Release through internal testing, then promote as an expedited forward fix.

### Backend, rules, and configuration

Android and web may use the same Firebase project. A backend rollback must remain compatible with the
current web client, the previous Android production version, and the partially rolled-out new Android
version.

- Prefer additive schema changes and dual-read/write migration windows.
- Keep old Cloud Function contracts until all supported clients have migrated.
- Roll back Firestore rules only after verifying that the older rules do not reopen a security issue.
- Use remote feature flags/kill switches for risky optional features, but never use a client flag as the
  only authorization control.
- Restore deleted/corrupted data only from verified backups with an auditable plan.
- After recovery, confirm Firestore consistency, Functions health, FCM, Google login, and both web and
  Android core journeys.

### Signing compromise

- If upload key is exposed, revoke access, rotate CI secrets, and request upload-key reset through Play.
- If a self-managed app-signing key is exposed, escalate immediately; impact is much greater. Play App
  Signing should be used to reduce this risk.
- Register new certificate fingerprints with Firebase/OAuth when the effective delivered signing
  certificate changes.

## Troubleshooting Matrix

### Build and toolchain

| Symptom | Likely cause | Checks and resolution |
| --- | --- | --- |
| Gradle says unsupported class/JVM or requires Java 17+ | Shell is using current Java 8 | Run `.\gradlew.bat --version`; point `JAVA_HOME`/Android Studio Gradle JDK to supported bundled JDK; reopen terminal |
| `sdk.dir is missing` | Android SDK path not configured | Create local `local.properties` through Android Studio or set SDK path locally; never hard-code a user path in shared Gradle files |
| `adb` not found | Platform tools absent from current PATH | Use `C:\Program Files\platform-tools\adb.exe` or add that directory to user PATH, then reopen terminal |
| Dependency/plugin resolution fails | Offline proxy, repository config, TLS/JDK mismatch | Confirm network and Gradle repositories; retry with supported JDK; do not disable TLS verification |
| Release build is signed with debug key | Misconfigured signing fallback | Inspect APK certificate; make release signing fail when secrets are absent; never upload artifact |
| Duplicate resources/manifest entries | Plugin or transitive manifest conflict | Inspect merged manifest and dependency tree; remove the narrow conflicting declaration, not whole validation tasks |
| AAB uploads but device cannot install | Unsupported SDK/ABI, signing, package conflict | Inspect Play device catalog and bundle explorer; test fresh Play install and upgrade separately |

### Google login and Firebase Auth

| Symptom | Likely cause | Checks and resolution |
| --- | --- | --- |
| `DEVELOPER_ERROR` / code 10 | Package name or SHA certificate mismatch | Compare installed certificate/package with Firebase Android app; add debug/upload/Play SHA-1 and SHA-256; refresh config |
| Account chooser never opens | Activity/result lifecycle or credential API setup issue | Confirm one request at a time, resumed Activity, correct credential configuration, and physical device Play services |
| Chooser works sideloaded but fails from Play | Missing Play app-signing fingerprint | Copy Play app-signing SHA values to Firebase/Google Cloud, not only upload-key SHA |
| User selects account then returns signed out | Firebase credential exchange/config failure | Inspect redacted auth code, provider enabled state, OAuth client, network, clock, and Firebase app ID |
| Login loops back to login | Native/web auth state not synchronized | Trace credential handoff, `onAuthStateChanged`, persisted session, route guard, and Activity/WebView recreation |
| Invite disappears during login | Pending deep link not persisted/restored safely | Verify `/join/:code` parsing, `pendingInviteCode`, auth completion, and consume-once behavior |
| Admin access missing after login | Custom claim token is stale | Force ID token refresh after claim grant, sign out/in, verify server-side claim and rules |

### WebView and UI

| Symptom | Likely cause | Checks and resolution |
| --- | --- | --- |
| White/blank screen at launch | Asset path, JS exception, WebView navigation, or build mismatch | Inspect debug WebView console/network, packaged assets, base URL, JS error reporting; keep stable native launch surface |
| Works on desktop web but not Android | Browser-only API/service worker/popup assumption | Check PWA install, service worker, web FCM, `window.open`, file download, and popup auth paths; provide Android-specific adapters |
| Back exits from nested screen | Native host and React history not coordinated | Log route label/back state; enforce one owner and precedence in `05-PERFORMANCE-AND-UX.md` |
| Back navigates twice | Both native and JavaScript handlers pop | Give each event a single request/response ID; consume once; remove duplicate listeners |
| Predictive Back preview disagrees | Callback enabled state is stale | Derive callback state from current observable navigation/surface state and handle cancellation |
| Header/bottom action under system bars | Insets consumed/mapped incorrectly | Inspect status/navigation/IME insets in gesture and three-button modes; fix root and dialog handling |
| Keyboard covers amount/submit | IME resize/inset or fixed viewport issue | Verify Activity resize behavior, IME insets, `100dvh`, scroll-to-focus, and sticky action layout |
| Rotation resets draft | State stored only in Activity/DOM | Add saved-state/draft restoration and idempotent save; test Don't keep activities |
| Touch feels delayed or scroll stutters | Main-thread JS, layout/paint, blur/chart, duplicate listeners | Record Chrome Performance and Perfetto traces; identify long tasks/forced layout/GC; test release build on low-tier device |
| App stays at 60 Hz on 120 Hz device | Device policy, battery/thermal state, WebView workload, or forced mode | Check Show refresh rate, battery saver/thermal status, release build, and app display-mode code; do not force unsupported rates |

### Notifications and deep links

| Symptom | Likely cause | Checks and resolution |
| --- | --- | --- |
| No notification permission prompt | Android version, prior denial, or request not triggered | Check API level and system app settings; request in context; never repeatedly prompt |
| Token created but no push arrives | Old web token schema or send payload mismatch | Verify native token record, Cloud Function target, Android payload/channel, Firebase project, and stale-token response |
| One user's second device stops receiving | Single `fcmToken` field overwritten | Migrate to per-device token records and fan out safely |
| Duplicate foreground notification | Both native system and web/in-app layer display it | Establish one foreground display owner and deduplicate by notification ID |
| Notification tap opens wrong route | Unvalidated/stale payload or auth restoration race | Allowlist destination, wait for auth, authorize resource, and provide safe fallback |
| App Link opens browser | Intent filter/domain verification/certificate mismatch | Verify HTTPS association file, package, signing fingerprints, host/path, and `adb shell pm get-app-links APPLICATION_ID` |

### Firebase data and backend

| Symptom | Likely cause | Checks and resolution |
| --- | --- | --- |
| `permission-denied` after Android launch | Auth missing/stale claims or rules reject new path | Confirm current UID/token claims, exact document path and rules emulator test; do not loosen rules broadly |
| `failed-precondition` requiring index | Missing Firestore composite index | Follow console link in a trusted session, add index to versioned config where possible, wait for build |
| Data updates repeatedly | Duplicate snapshot listeners after lifecycle changes | Count subscriptions, unsubscribe on stop/route exit/logout, and test five recreate cycles |
| Duplicate expense/settlement | Double submit, retry, offline replay, non-idempotent backend | Disable in-flight action, use operation ID/transaction, test process death and reconnect |
| Bill scanning fails only in production | Cloud Function secret/deploy/config issue | Confirm `GEMINI_API_KEY` secret binding, function revision, Firebase project, auth, logs, quota, and redacted payload size |
| Web works but Android schema breaks Functions | Backend migration was not backward-compatible | Compare payload contracts by client version; restore dual support and add contract tests |

## Data Deletion Operations

Account deletion requests must be authenticated or otherwise identity-verified. Maintain an auditable
workflow:

1. Receive request in-app or through the public deletion page.
2. Verify identity without asking the user to email secrets or ID tokens.
3. Enumerate Firebase Auth, user profile, device tokens, uploads, private logs, and shared records.
4. Apply the published deletion/anonymization policy to shared expense history.
5. Delete or anonymize via privileged backend code, not direct client escalation.
6. Revoke sessions and tokens.
7. Record request/completion metadata without retaining the deleted content.
8. Confirm completion to the user within the published timeframe.

Test this flow in staging and with synthetic multi-user groups before production. A partial deletion that
leaves an active Firebase Auth account or FCM token is a failure.

## Weekly Operational Review

- [ ] Review Play Android vitals, Crashlytics, ANRs, JavaScript errors, and support trends by version.
- [ ] Review Firebase Auth failures, Functions errors/latency, Firestore denials, and FCM stale tokens.
- [ ] Verify current production rollout and version adoption.
- [ ] Confirm privacy/deletion requests are within response targets.
- [ ] Check dependency, Android target API, Play policy, and SDK deprecation notices.
- [ ] Review Play/Firebase/CI account access and suspicious activity.
- [ ] Confirm signing key backup and recovery documentation remain accessible to authorized owners.
- [ ] Convert recurring manual diagnosis into a redacted dashboard, alert, or automated test.

## References

- [Firebase App Distribution](https://firebase.google.com/docs/app-distribution)
- [Firebase Crashlytics Android setup](https://firebase.google.com/docs/crashlytics/android/get-started)
- [Android app quality and vitals](https://developer.android.com/topic/performance/vitals)
- [Android performance measurement](https://developer.android.com/topic/performance/measuring-performance)
- [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)
