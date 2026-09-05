# paymatrix APK workflow audit — 5 September 2026

## Verdict

**Do not sign off this build as free of backend/workflow issues.** The native app has working infrastructure and useful recovery improvements, but the current source contains financial-editing mismatches, unbounded loading paths, incomplete live updates, and integration gaps. Fix the high-priority findings before wider testing.

This is an audit report, not a claim that every button was exercised against production. `verified-static` means the implementation or contract directly establishes the issue; `verified-runtime` means a command/test/live response established it. Physical-device and authenticated end-to-end outcomes remain `needs-confirmation`.

## Exact scope and evidence

- Native Kotlin/Compose client: `native-android/`; legacy Capacitor client excluded.
- APK: `releases/paymatrix-native-2.1.8.apk`, package `com.paymatrix.app`, version `2.1.8`, code `21008`.
- SHA-256: `DC7A00EB38E256B444E18DA611E6E4EEFAF63957306A1A117E4B99F634CD2676`.
- APK signature verifies; signer SHA-1: `67:A9:E5:FA:08:CD:B6:79:32:56:18:46:14:F6:03:83:53:57:30:3D`.
- Branch `main`; HEAD `85391a6122c8dfcc8b68251b7f611f92d8e8668c`. HEAD and locally recorded `origin/main` were 0 ahead/0 behind; no remote fetch/publication was performed.
- Existing uncommitted 2.1.8 source/config changes and artifacts were present before the audit. They were preserved. Source findings apply to this working tree; artifact hash matches its existing release notes, but no reproducible-build equivalence claim is made.
- Fresh `testDebugUnitTest --rerun-tasks`: **14 passed**, including 8 balance tests and 6 recovery tests.
- Firestore emulator against **demo-paymatrix**, using checked-in rules: **23 passed**, 0 failed. This verifies local rules, not deployed-rule equality.
- Release lint: **0 errors, 47 warnings**. Most warning counts concern icons/dependencies/resources; this does not establish UI responsiveness.
- Signed APK installed and cold-launched successfully in a disposable API 36 emulator. App process remained present. Launch took 7.297 seconds on this loaded emulator; this is not a physical-device performance benchmark.
- Login screenshots captured at 1080×2400 and 720×1280 / density 320 / font scale 1.3. Default login fits. At the smaller configuration the submit control extends below the visible content area; source provides vertical scrolling, but scroll/keyboard interaction was not conclusively verified.
- UIAutomator inspection failed with a UiAutomation connection timeout. Its crash record belongs to the inspection process, not an established paymatrix crash. Existing two Compose tests are documented in release notes but were **not rerun** in this audit.
- Live scanner GET: **405**; unauthenticated POST: **401 Authentication required**. Successful authenticated AI extraction was not tested.
- Live `https://pay-matrix.vercel.app/.well-known/assetlinks.json`: **200 text/html**, containing the SPA HTML. Emulator app-link domain state: **1024**, not verified.
- No physical phone was connected. No production account was created, no real ledger was changed, no payment was initiated, and no messages were sent.

## Prioritized findings

### 1. Editing a percentage/share expense silently converts it to equal splitting — High, verified-static

`ui/ExpenseFormScreen.kt:51` accepts only equal/exact/itemized when initializing the edit form, otherwise choosing equal. `domain/BalanceEngine.kt` supports percentage/shares, and the shared web/backend model can contain these records.

Example: a ₹1,000 expense split 80%/20% is opened on Android to correct its notes. Saving initializes equal splitting and can write ₹500/₹500 instead of ₹800/₹200. This changes balances without an intentional split change.

Required correction: preserve every existing split mode and its original values, or explicitly prevent unsupported edits. Verify a title-only edit leaves every participant's paise amount unchanged for all five modes.

### 2. Payer selector lies during expense editing — High, verified-static

`ExpenseFormScreen.kt:260–278` allows selecting another payer on edit. `data/FirebaseRepository.kt:379–407` writes the selected `paidByName` but never changes `paidBy`. `firestore.rules:379–401` deliberately keeps payer identity immutable.

Example: change payer A to B and save. The backend keeps A as payer while the label may identify B. Balances follow A. Required correction: disable payer changes on existing expenses and explain the correction workflow, or design an explicit audited replacement flow consistent with the backend contract.

### 3. Offline operations can trap the user behind a non-dismissible spinner — High, verified-static

The global `PayMatrixViewModel.action()` has no deadline. `Components.kt` makes `BusyOverlay` non-dismissible by Back or outside tap. Numerous mutations use Firestore `.await()` without a connectivity gate or bounded acknowledgment: group creation/join/update, friendships, log-group actions, profile writes, push-token writes, and others.

Particularly clear example: `AuthRepository.signOut()` waits for push-token deletion **before** `auth.signOut()`. Offline, that deletion can remain queued and local sign-out never runs until acknowledgment. A slow/disconnected write can block all foreground actions. The 2.5-second helper covers selected financial/log writes only, and prerequisite reads can still take longer.

Required correction: define online-only versus queueable behavior for every mutation; make local sign-out independent of remote cleanup; provide bounded waiting and explicit unresolved status. Do not blindly retry writes whose outcome is unknown.

### 4. Live updates and rotation can destroy expense drafts — High, verified-static

`ExpenseFormScreen.kt:45–64` stores fields with `remember(editing, scan)` and participant choices with `remember(snapshot, editing)`. A changed group snapshot rebuilds the participant map; a remotely edited expense rebuilds other fields. These fields are not saved across activity recreation.

Reproduction to run with two test users: A starts a draft and deselects a participant; B adds an expense in that group. A's selected participants can reset. Rotate during a draft to test loss of ordinary remembered fields. Required correction: maintain a draft keyed by stable record ID, preserve it across recreation, and show incoming conflicts explicitly.

### 5. Draft-level conflict detection is incomplete — High, verified-static

`Models.kt` does not retain an expense version in the UI model. `updateExpense()` fetches the latest version at save time and applies the entire possibly older draft with that version + 1. Rules reject overlapping writes with the same version, but cannot detect a stale draft that has been attached to a newly fetched version.

Required correction: carry the version seen when editing began and compare it before saving. Test two editors changing different fields and ensure one cannot silently overwrite the other's completed work. Existing stale-version rule tests do not prove this UI-level guarantee.

### 6. Successful writes followed by failed refreshes look like failed saves — High, verified-static

Expense/log-entry save paths now separate success from refresh. Many other actions still perform write → reload → success callback, including settlement, group creation/update/join, and log-group creation. If the write succeeds but the reload fails, the dialog remains open and a generic failure is shown. Retrying a creation or settlement generates a new ID and can duplicate the operation.

`createGroup()` additionally swallows each selected-member addition error and proceeds as if creation completed fully (`PayMatrixViewModel.kt:164–168`). A group can be created with fewer members than selected, without disclosure.

Required correction: surface committed versus failed stages separately; retain stable operation IDs for uncertain/retried creations; disclose partial member-addition results.

### 7. Native mutations do not create their push-triggering notifications — Medium, verified-static

Native expense/friend/settlement writes do not create notification documents or call `createCrossUserNotification`. `functions/index.js:92` triggers push delivery on `notifications/{notificationId}` creation, not on expense/friendship documents. The web expense service explicitly creates notifications.

Consequence: backend data can change from Android without the corresponding recipient notification/push produced by the checked-in integration. Live deployment of any additional, external trigger was not inspected. Required correction: add the authorized notification path and verify one event produces one notification on a second account/device.

### 8. Automatic invite opening is broken/incomplete — Medium, verified-runtime + static

The live assetlinks path serves HTML, so it cannot establish Android verified association. Emulator domain verification is unsuccessful. Separately, `MainActivity.kt` has no `onNewIntent` handling despite `singleTask`; the composable navigation effect is keyed to user changes, not incoming links.

Required correction: serve valid association JSON with the actual active app-signing SHA-256 fingerprints; handle cold launch, warm launch, signed-out pending invite, and already signed-in navigation. A cold-start gate also navigates directly to dashboard, so the invite path needs explicit regression coverage.

### 9. Real-time failures are hidden and several screens are not real-time — Medium, verified-static

`FirebaseRepository.kt:87–132` ignores snapshot-listener errors. `groupActivity()` and `logActivity()` turn failed reads into empty lists. Friends and spending-log entries are loaded on entry/actions rather than subscribed to live changes. A failed initial home refresh prevents the following `startHomeRealtime()` call from running.

Consequence: access loss, network problems, or a second user's changes can appear as empty/stale data without a trustworthy refresh state. Required correction: expose loading/empty/error/stale states separately, subscribe where collaboration requires it, and restart failed subscriptions after recovery.

### 10. Export can fail after leaving a group — Medium, verified-static contract mismatch

`FirebaseRepository.kt:677–697` queries historical membership then reads each group's expenses/settlements/logs. Group-document rules allow historical members to read the group, but financial subcollections require current membership. Therefore a non-admin former member can get permission denied and lose the entire export.

Required correction: define the former-member export contract, implement authorized partial export or an appropriate server path, and explain exclusions. Do not broaden access casually.

### 11. Notification list can omit the newest alerts — Medium, verified-static

`notifications()` applies `.limit(30)` without ordering, then sorts the returned subset locally. The newest notifications may never enter that subset. `markAllNotificationsRead()` queries `read == false`, while display also supports legacy `isRead`; missing `read` records are not handled equivalently. Large unread collections are submitted in a single batch without chunking.

Required correction: order before limiting with the required index, normalize legacy read state, and bound/chunk bulk operations.

### 12. Rapid edit/delete/restore can receive misleading permission failures — Medium, verified-static

Expense and settlement rules require over one second since the previous mutation (`firestore.rules:401,439`). The UI only blocks while the previous action is pending; it does not model this interval. An immediate restore or subsequent edit can be rejected as permission denied, including when offline operations are flushed close together.

Required correction: reconcile the backend throttling contract with queue/retry behavior and use an actionable message. Preserve duplicate/concurrency protection.

### 13. Authentication/profile operations have partial-completion gaps — Medium, verified-static

- Registration creates the Auth account, then updates its name and sends verification email. If either latter step fails, the UI does not advance to the verification state, although the account may already exist. Retrying can show “email already in use.”
- Profile update writes the private document, silently ignores public-profile failure, then updates Firebase Auth. Failure in the last step can show “failed” after a backend change already succeeded.
- Login silently skips friend-code/public-profile initialization failures. Missing code is not repaired by the ordinary persisted-session `currentVerifiedProfile()` path.

Required correction: make bootstrap resumable, show each partial state accurately, and repair missing profile fields on later sessions.

### 14. Queue feedback is not a durable per-record recovery workflow — Medium, verified-static

`trackPending()` tracks in-memory counts and one latest error. Subsequent task completion can clear a previous failure; banners are rendered by `MainShell`, not all group/expense screens. A queued save closes its form, so a later rejection does not preserve a recoverable draft in the implementation inspected. Background action jobs are not all scoped/cancelled by account/session change.

Required correction: retain operation-specific outcome and draft recovery, make sync status accessible on the screen where a write originated, and prevent old-session jobs from publishing new UI state.

### 15. Receipt handling can cause UI stalls and locale problems — Medium, verified-static

`ScannerScreen.loadUri()` decodes the full image on the UI thread before `BillScanner` downsizes it. Large gallery photos can allocate substantial memory and stall rendering. Camera URI/result state uses ordinary `remember`; recreation during external camera flow needs testing. HTTP work runs on IO, but blocking `execute()` is not explicitly cancelled when the coroutine is cancelled.

Expense/log edit amounts and scan totals use default-locale `"%.2f".format(...)`, while split inputs use dot-based numeric parsing. A comma-decimal locale requires explicit testing and consistent formatting/parsing.

Required correction: sampled background decode, recreation-safe capture state, cancellation-aware HTTP, and locale-safe canonical numeric values.

### 16. Large histories and nonfriend payees expose integration limits — Medium, verified-static / needs-confirmation for device impact

Dashboard reads all expenses/settlements across groups; group snapshots read complete subcollections and every member profile; activity fetches everything before applying a local limit. Realtime invalidation can repeat those reads. This can increase latency, bandwidth, and memory as histories grow. No large-dataset frame/network benchmark was run.

UPI ID is obtained from the private profile; rules permit that read only for self/friends/admin. A group member who joined by invite but is not a friend can have a public name while their UPI ID is unavailable. Preserve that privacy boundary, but provide an explicit authorized payee-details workflow rather than assuming all group members have readable payment details.

## Workflow coverage and expected click behavior

| Workflow | Trace/check completed | Remaining verification or finding |
|---|---|---|
| Cold start and APK identity | Signed release installed; login renders; persistent Firestore cache configured | Physical cold/warm start and upgrade/session restoration |
| Google login | Credential Manager → bounded reauth recovery → Firebase credential → token/profile/bootstrap → home traced; recovery unit tests pass | Actual account chooser, cancellation, restricted account, Play-signed build; no Google login success asserted |
| Email registration | Auth creation → name → verification email traced | Delivery, resend throttling, partial completion; finding 13 |
| Email login/verification/reset/link | Verification gate, forced token refresh after verification, password linking preserving UID traced; verified/unverified rules tests pass | Real email flows and deployed provider/rules alignment |
| Sign out/account deletion | Token cleanup, local logout, reauthentication, anonymization batch, Auth deletion traced; local deletion-rule fixture passes | Offline logout, Auth deletion failure after anonymization, second-device/session lifecycle |
| Home/groups | Home parallel reads and group invalidation traced | Failed startup recovery, loading versus empty states, large histories |
| Create/join/edit/leave/delete group | Native payloads and membership rules inspected; join rule test passes | Partial member additions, late read failure, duplicate submit after uncertain success |
| Add expense | Validation → integer-paise splits → expense/audit/group batch → confirmed or queued feedback → close → background refresh | Signed-in online/offline/restart/rejection delivery; actor/profile prerequisite reads |
| Edit expense | Same record update + incremented version + atomic audit; success closes form before refresh | Findings 1–5 are release priorities |
| Delete/restore expense | Soft-state update + audit/version traced; legacy deletion rule fixture passes | Rapid restore, offline rejected writes, form/retry feedback |
| Settlement/UPI | Online precheck, user-confirmed ledger mutation, QR fallback, atomic audit; payer authorization tests pass | Physical UPI apps, missing UPI details, network drop after precheck, duplicate retry; no money movement asserted |
| Friends | Deterministic request ID and atomic reciprocal acceptance inspected; authorization fixtures pass | Push generation, live incoming requests, offline mutations |
| Spending logs | Create/edit/delete/import and atomic activity writes inspected; relevant rule fixtures pass | Multi-device refresh, entry draft recreation, full create/member-add recovery |
| Notifications/push | Token registration/rotation + function trigger + reader traced | Native event creation, delivery permissions, token cleanup, tap-to-destination; findings 7/11 |
| Receipt scan | Runtime camera permission, FileProvider, token-bearing request, protected endpoint inspected; live 401 check | Camera denial/recreation, large image, real AI success/error/429, cancellation |
| Analytics/activity | Calculation/filtering paths inspected; money unit tests pass | Large histories, stale data, silent audit-read failure |
| Profile/export | Save callbacks and JSON export path traced | Partial updates, historical access, file-picker cancellation/process recreation |
| Loading/button feedback | Global synchronous foreground gate; disabled shared actions; modal spinner; selected save callbacks inspected | Existing UI tests cover only two shared components; no full-button authenticated coverage |
| Responsiveness/accessibility | Default/small large-font login screenshots; scrollable/lazy screen structures inspected | Keyboard, landscape, TalkBack, larger text, long member lists/dialogs, physical low-end device frame timing |

## Things the implementation already does well

- Financial writes pair mutations with audit records; rules verify actor/member access and versions.
- Integer-paise allocation and exclusion of explicitly unconfirmed settlements have unit-test coverage.
- The foreground gate is acquired before coroutine launch, limiting immediate repeated save taps.
- Expense/log-entry save callbacks preserve forms on immediate write failure and distinguish post-save refresh failure.
- Persistent Firestore cache is enabled; selected writes explicitly report pending synchronization instead of pretending server acknowledgment.
- HTTPS networking, Internet permission, and the scanner's token-bearing backend request are present. There is no WebView/CORS dependency in the native Firestore path.
- Email verification and Google login both remain supported. APK installation/signature/startup checks passed in this emulator.

## Concrete completion gate after fixes

1. Use two disposable verified accounts A/B and a third invited nonfriend C. Run the exact release/Play build on the previously affected physical phone and another Android version.
2. Exercise Google chooser/cancel/retry, registration, email verification/resend/reset, password linking, sign-out offline, and session restoration. Verify the installed version and signing certificate.
3. Create/join groups; add/remove members; submit each split mode; change only a title; confirm exact persisted paise splits and payer identity from a second client.
4. Edit simultaneously on A/B, mutate a group while A has a draft, rotate/background/kill/reopen. Verify explicit conflict handling and draft retention.
5. For each mutation, test online, slow network, loss before submit, loss during acknowledgment, offline queue/reconnect, permission revocation, and retry after ambiguous completion. Count records/audit events to prove no duplication.
6. Verify push on B from A's Android actions, notification ordering/read state, token rotation/logout, and notification-tap destination.
7. Test camera permission denied, gallery large image, scan timeout/401/429, successful scan review, and safe return from external UPI/camera apps.
8. Test 360×640 dp, landscape, keyboard open, font scales 1.3/2.0, long names, many members, and large ledgers. Capture frame timing, not just screenshots.
9. Export after leaving a group; verify account-deletion partial failure and retained shared history; verify invite links cold/warm/signed out.
10. Compare deployed rules/indexes/providers/App Check and active Play signing certificates with the tested configuration. Green local tests alone do not close this gate.

## Audit artifacts

Logs and login screenshots from this run are retained under `docs/audit-2026-09-05/`. No application source fixes, commits, pushes, PRs, merges, or deployments were performed as part of this report.
