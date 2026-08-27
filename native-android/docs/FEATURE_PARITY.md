# Native 2.0.0 beta feature parity

## Implemented in the native client

- Credential Manager Google sign-in and Firebase Auth profile bootstrap
- Dashboard, balances, activity, analytics, notifications, and active groups
- Create/edit/archive group, invite/join, add/remove members, and safe leave constraints
- Group overview, expenses, members, insights, audit activity, and simplified debts
- Equal, exact, share, percentage, and itemized/GST expense splits
- Expense create/edit/soft-delete/restore using atomic audited writes
- User-confirmed settlements with online preflight and audited writes
- Optional native UPI chooser
- Friend-code request, incoming/outgoing requests, acceptance/rejection, and removal
- Notification inbox, read state, runtime permission and FCM token registration
- Personal log groups, shared members, manual entries, imported expense shares, edit and delete
- Profile, UPI ID and phone updates; JSON export; reauthenticated account deletion
- Full-resolution FileProvider camera capture, gallery selection, and authenticated bill scan endpoint
- Offline Firestore cache, visible network status, and real-time snapshot refresh
- Deep-link manifest for `/join/:code`
- Remote feature flags and maintenance state
- Claim-protected admin overview, users, groups, notifications, security logs, flags and AI request records
- Edge-to-edge layout and high-refresh display-mode request
- R8 and resource shrinking for release builds
- Kotlin tests for money allocation, every split mode, balances, deleted records, settlements and debt simplification

## Before replacing the released APK

- Complete authenticated device smoke tests for critical journeys.
- Add Macrobenchmark and generate an app-specific Baseline Profile on a managed/physical device.
- Confirm both `com.paymatrix.app` and `com.paymatrix.app.native.beta` remain installed side-by-side.
- Run Google login, existing-user data, group, friend, expense, offline, FCM, scan and UPI smoke tests on a physical signed-in device.
- Verify 60, 90 and 120 Hz frame timing using release builds.
- Complete the data-safety/release documentation before public distribution.
