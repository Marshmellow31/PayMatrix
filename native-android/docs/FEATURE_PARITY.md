# Feature parity checkpoint

## Implemented in the native client

- Credential Manager Google sign-in and Firebase Auth profile bootstrap
- Dashboard and active group list
- Create group and join by invite code
- Group detail, balances and simplified debts
- Equal-split expense creation using atomic audited Firestore writes
- Expense archival using audited soft deletion
- User-confirmed settlements with online preflight and audited writes
- Optional native UPI chooser
- Friend-code request, incoming/outgoing requests and acceptance/rejection
- Notification inbox, read state, runtime permission and FCM token registration
- Personal log groups and manual log entries
- Profile, UPI ID and phone updates
- Direct camera capture and authenticated bill scan endpoint
- Offline Firestore cache
- Deep-link manifest for `/join/:code`
- Edge-to-edge layout and high-refresh display-mode request
- R8 and resource shrinking for release builds
- Kotlin tests for money allocation, splits, balances, settlements and debt simplification

## Intentionally retained in the web admin

The administrative dashboards, bulk user/group management, security-log inspection, feature-flag editing and AI-request reporting remain in the web app. They are trusted operational tools and do not benefit from a consumer APK rendering rewrite. Their callable Cloud Functions remain unchanged.

## Before replacing the released APK

- Add Compose UI/instrumentation tests for critical journeys.
- Add Macrobenchmark and generate an app-specific Baseline Profile on a managed/physical device.
- Verify release signing certificate against `v1.2.5`.
- Install the release build as an update over `v1.2.5`.
- Run Google login, existing-user data, group, friend, expense, offline, FCM, scan and UPI smoke tests on a physical signed-in device.
- Verify 60, 90 and 120 Hz frame timing using release builds.
- Complete the data-safety/release documentation before public distribution.
