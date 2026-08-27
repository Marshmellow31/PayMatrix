# paymatrix native Android 2.0.0 beta

This isolated folder is a Kotlin/Jetpack Compose client for the existing paymatrix backend. It does **not** bundle the React/Vite site and does not use Capacitor or a WebView. The released Capacitor APK remains untouched while this beta is validated.

## What is shared

- Firebase project: `paymatrix-174b5`
- Firestore collections, rules and existing user data
- Firebase Authentication accounts
- Cloud Functions and the Vercel bill-scanning endpoint
- Existing Cloud Functions, security rules, bill-scanner endpoint, and user UIDs
- Existing release signing identity for provenance, although the beta uses its own package

The native beta package is `com.paymatrix.app.native.beta` for both debug and release. Its Firebase Android app ID is `1:344969363066:android:c5e102849412117c3305c3`. It installs beside the Capacitor package `com.paymatrix.app`; installing or uninstalling one does not replace the other.

## Quick start

1. Install Android Studio with SDK 36 and use its bundled JDK 21.
2. Open this `native-android` directory in Android Studio.
3. Run unit tests: `./gradlew testDebugUnitTest`.
4. Build the side-by-side APK: `./gradlew assembleDebug` or `./gradlew assembleRelease`.
5. Install `app/build/outputs/apk/debug/app-debug.apk` on a Google Play-enabled device.

PowerShell from the repository root:

```powershell
& .\native-android\scripts\build.ps1
```

## How an expense flows

```text
ExpenseFormScreen
    -> PayMatrixViewModel.addExpense()
        -> FirebaseRepository.addExpense()
            -> Money.toPaise() + BalanceEngine.calculateSplits()
                -> one Firestore batch
                    1. groups/{groupId}/expenses/{expenseId}
                    2. groups/{groupId}/logs/{mutationId}
```

The rules require the expense and audit log to reference each other. A batch makes the operation atomic: both documents become valid together or nothing is written.

## Folder map

- `app/src/main/java/com/paymatrix/app/ui`: Compose screens and reusable UI
- `PayMatrixViewModel.kt`: screen state and user actions
- `data/AuthRepository.kt`: Credential Manager and Firebase Auth
- `data/FirebaseRepository.kt`: Firestore-compatible reads and writes
- `domain/Money.kt`: integer-paise parsing, formatting and allocation
- `domain/BalanceEngine.kt`: split, balance and debt algorithms
- `app/src/test`: parity-focused unit tests
- `docs/LEARNING_GUIDE.md`: detailed explanation
- `docs/FEATURE_PARITY.md`: implemented and deliberately web-only areas

## Beta identity

- Name: `paymatrix beta`
- Package: `com.paymatrix.app.native.beta`
- Version name: `2.0.0-beta`
- Version code: `20000`
- Capacitor package retained: `com.paymatrix.app`

The build first checks `native-android/key.properties`, then falls back to the existing ignored `android app/android/key.properties`. This keeps release signing controlled while package separation guarantees coexistence.

Building is not publishing. The included distribution script uploads the beta artifact to its dedicated Firebase Android app after a tester group is chosen. Firebase CLI cannot compile the APK or silently update an installed phone.

## Safety boundary

Opening a UPI app does not prove payment. The user must verify Google Pay/bank history and then press **I verified payment — record**. The ledger continues to use user-confirmed state and preserves the QR/UPI fallback boundary.
