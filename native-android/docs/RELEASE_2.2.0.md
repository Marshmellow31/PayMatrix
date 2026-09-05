# paymatrix 2.2.0 (22000)

## Overview & Alignment

This release brings the native Android app and Web/PWA client into 1:1 parity across versioning (`2.2.0`), financial split models, collaborative spending logs, and concurrency safeguards.

## Key Changes

### 1. Collaborative Log Group Editing
- Group members (not just the creator) can view, add, and edit spending logs within shared groups.
- Firestore security rules updated for `users/{userId}/spendingLogGroups/{groupId}` and `logs/{logId}` subcollection to authorize shared group members (`hasAnyRole(['admin', 'member', 'owner'])` or membership check).
- Synchronized in native Android (`LogsProfileScreens.kt`) and Web PWA (`LogTimeline.jsx`, `LogGroups.jsx`).

### 2. Full 5-Mode Expense Split Parity
- Native Android and Web PWA support all 5 allocation modes with identical integer-paise arithmetic:
  - **Equal (`equal`)**: Deterministic paise remainder distribution to the payer.
  - **Exact (`exact`)**: Explicit integer paise amounts per participant with sum verification.
  - **Percentage (`percentage`)**: Integer basis-point rounding with zero-sum remainder correction.
  - **Parts / Ratio (`parts`)**: Share weighting with remainder assignment to the payer.
  - **Adjustment (`adjustment`)**: Offsetting fixed amounts before equal remainder distribution.
- Zero floating-point rounding errors across both platforms.

### 3. Concurrency & Workflow Audit Resolutions
- Implemented optimistic concurrency version checking in web `expenseService.js`, matching Android's `ActionRecovery.kt` mutation gate.
- Ensured unconfirmed settlements are excluded from debt calculations.
- Synchronized changelog and system settings cards across Web and Native UI.

## Verification & Artifacts

- **Frontend Vitest**: 31 unit tests passed (`balanceEngine.test.js`, `analyticsEngine.test.js`, `firestoreSerialization.test.js`).
- **Native JVM Tests**: 19 unit tests passed (`ActionRecoveryTest`, `BalanceEngineTest`).
- **Frontend Build**: Vite production build succeeded (PWA precache: 112 entries).
- **Android Release Build**: Gradle `assembleRelease` and `bundleRelease` completed cleanly.
- **APK Verification**: `apksigner` confirmed v2 signature scheme; `zipalign -c 4` confirmed 16 KiB alignment.
- **AAB Verification**: `jarsigner` signature verified.

### Release Artifact Hashes

- **APK (`releases/paymatrix-native-2.2.0.apk`)**:
  `b530d35072865e49422a06b556c8b551e88e3621ee514f343c0cd2a4c9bc2592`
- **AAB (`releases/paymatrix-native-2.2.0.aab`)**:
  `806dc8c764f9c2b835aba97a99b1521cb891329255763aab4bb0c829ccbfa746`
- **ProGuard/R8 Mapping**: `releases/paymatrix-native-2.2.0-mapping.txt`

## Play Test Handoff

Upload the signed 2.2.0 AAB (`paymatrix-native-2.2.0.aab`) to the Google Play Console internal or closed testing track. Verify version `2.2.0` (code `22000`). Test Google Sign-In, 5-mode expense creation, and collaborative log editing between multiple accounts.
