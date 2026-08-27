# Native 2.0.2 feature parity

Implemented native flows:

- Google account sign-in and profile photo persistence
- Dashboard balances, quick expense/scanner actions, and settlements
- Friends, friend codes, requests, Google profile photos, and shared-group navigation
- Group creation/joining, member photo stacks, expenses, members, activity logs, insights, invites, leaving, and deletion
- Equal, exact, percentage, and share-based expense splitting
- User-confirmed settlement recording with UPI launch disclaimer
- Logs, analytics, notifications, receipt scanning, profile editing, export, privacy, and account deletion
- Offline Firestore cache, live refresh listeners, deep links, and native camera permission

Visual parity work in 2.0.2 uses the exact web Digital Obsidian surface hierarchy (`#1A1A1A`, `#151515`, `#1B1B1B`, and `#242424`), web-inspired Friends and Logs layouts, and real cached Google avatars with deterministic colored fallbacks. Coil's OkHttp network transport is included so remote Google and Firebase Storage photos can actually load.

The administrator console was intentionally removed from the Android client. Administration belongs in a separately secured operational tool, not a consumer APK.
