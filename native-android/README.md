# paymatrix native Android

This folder is a clean-room Android client for the existing paymatrix backend. It does **not** bundle the React/Vite site and it does not use Capacitor or a WebView.

## What is shared

- Firebase project: `paymatrix-174b5`
- Firestore collections, rules and existing user data
- Firebase Authentication accounts
- Cloud Functions and the Vercel bill-scanning endpoint
- Android production package: `com.paymatrix.app`
- Existing release signing identity when `key.properties` points at the established keystore

The debug APK uses `com.paymatrix.app.native.dev`, which is registered as a second Android app inside the same Firebase project. This lets it coexist with the released Capacitor APK.

## Quick start

1. Install Android Studio with SDK 36 and use its bundled JDK 21.
2. Open this `native-android` directory in Android Studio.
3. Run unit tests: `./gradlew testDebugUnitTest`.
4. Build the side-by-side APK: `./gradlew assembleDebug`.
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

## Release compatibility

The release variant deliberately has package `com.paymatrix.app` and version code `10300`, which is higher than Capacitor release `10205`. Android will accept it as an update only when it is signed by the exact existing release certificate.

The build first checks `native-android/key.properties`, then safely falls back to the existing ignored `android app/android/key.properties`. Copy `key.properties.example` only when configuring another machine. Do not create a replacement key for an update build.

Building is not publishing. Firebase CLI can register app variants, download SDK configuration, verify rules and upload a finished APK to **Firebase App Distribution**. It cannot compile the APK and it cannot update an APK already installed on a phone.

## Safety boundary

Opening a UPI app does not prove payment. The user must verify Google Pay/bank history and then press **I verified payment — record**. The ledger continues to use user-confirmed state and preserves the QR/UPI fallback boundary.
