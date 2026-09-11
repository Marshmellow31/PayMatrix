# paymatrix 2.1.8 (21008)

## Changes

- Includes the existing Firebase configuration addition for SHA-1 D0:C2:C5:A1:7F:B1:31:F3:B9:38:34:25:37:3E:93:89:38:76:BE:A5. The matching Android OAuth mapping was independently read from Firebase during this build. No cloud configuration was changed in this task.
- Keeps the explicit Google sign-in button request. An account reauthentication failure triggers one credential-state clear and one alternate Google account chooser request. User dismissal and coroutine cancellation do not trigger retries. Authentication stage breadcrumbs distinguish Google credential acquisition from Firebase sign-in.
- Foreground mutations acquire a gate before launching their coroutine, preventing rapid repeat submissions. Background reads cannot clear the foreground loading state.
- Save actions display an animated modal progress indicator above open forms. Action buttons disable while a foreground operation is pending. Expense, spending-entry and profile forms retain their inputs on write failure; entry/profile dialogs now close only through success callbacks.
- Expense and spending-entry saves no longer wait for a full screen refresh before completing. A subsequent refresh failure explicitly says that the change was already saved.
- Parallelizes public/private profile reads and computes group snapshots on Dispatchers.Default. Supported offline-capable writes wait at most 2.5 seconds for acknowledgement before returning an explicit pending-sync result. This does not change settlement confirmation or authorization rules.
- Correctly propagates coroutine cancellation from background refreshes instead of displaying obfuscated cancellation messages. Firebase/credential errors receive readable messages; diagnostic records retain stack locations without copying credential payloads or exception messages.
- Handles numeric legacy record versions consistently in archive/restore operations.

## Evidence and limits

The earlier claim that v2.1.7's one-shot Google request was the proven cause of the friend's failure was too strong. It is a supported Google button flow. The observed code change and successful sideload test were confounded by different devices, app versions, and signing certificates. This build adds bounded recovery; it does not establish that the friend's underlying Google account/certificate failure is resolved.

The reported `y1 failed` text has not been reproduced with an exact stack trace. Cancellation handling was demonstrably incorrect, and the available release mapping contains an obfuscated StandaloneCoroutine named y1. That makes cancellation a plausible explanation, not an established diagnosis of the user's specific error.

## Verification

- 14 JVM tests passed, including six recovery/action-state regression tests.
- 23 Firestore emulator authorization tests passed against demo-paymatrix.
- Release lint: 0 errors, 47 warnings.
- Google button guidance: https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation
- Two Android API 36 Compose UI tests passed: save buttons disable/re-enable, and saving progress is visible above an open form. Tests ran in a disposable read-only emulator session.
- Release APK verifies with v2 signing and the unchanged upload SHA-1 67:A9:E5:FA:08:CD:B6:79:32:56:18:46:14:F6:03:83:53:57:30:3D. APK package/version/label verified; 16 KiB zip alignment passed.
- AAB JAR verification passed. JDK reports self-signed-certificate/no-timestamp and JarInputStream manifest-order warnings; Play upload validation is still outstanding.
- APK SHA-256: dc7a00eb38e256b444e18da611e6e4eefaf63957306a1a117e4b99f634cd2676
- AAB SHA-256: 7aef905b7a90f171e0845b7ffed6ea3713f97776bb1b2f9b60a52a770bd7ce0e
- Matching R8 mapping file is retained beside the release artifacts.
- Release APK upgraded 2.1.7 to 2.1.8 in the disposable API 36 emulator with firstInstallTime preserved. Cold launch completed successfully; app process remained alive and the crash buffer was empty. This does not verify physical-device Google authentication.

## Play test handoff

Upload the signed 2.1.8 AAB to the existing Play test track. On the friend's failing phone, update through Google Play and verify 2.1.8 / 21008. Try the same Google account, then test cancellation, sign-out/sign-in, expense creation/editing, and spending-log save on a slow connection. Verify exactly one record is created after repeated taps. Check pending sync resolves and the saved data survives reopening the app.

If Google sign-in still fails, obtain the exact installed signing certificate and sanitized credential-stage failure from that phone. Compare every active Play app-signing certificate with Android OAuth registrations for com.paymatrix.app and the web client ID in the same project. Do not infer certificate correctness from the presence of an unverified fingerprint alone. Avoid clearing Google Play Services or removing personal Google accounts as a default workaround.

Package com.paymatrix.app, Firebase project paymatrix-174b5, release signing identity, financial arithmetic, and user-confirmed settlement behavior are retained. No Play/GitHub publication is part of this local build.
