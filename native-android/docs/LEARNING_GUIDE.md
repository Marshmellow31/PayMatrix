# How the native paymatrix app works

## 1. Android starts the process

`PayMatrixApplication` initializes Firebase once and creates an `AppContainer`. The container owns repositories, so screens do not construct database objects themselves.

`MainActivity` creates the Compose UI, enables edge-to-edge drawing and requests the fastest display mode with the device's current resolution.

## 2. Compose describes the screen

A composable function describes what should appear for the current state. It does not manually find and mutate views. When `PayMatrixState` changes, Compose recalculates affected functions and updates only changed UI nodes.

Stable list keys use Firestore document IDs. This lets Compose reuse rows rather than recreate every item during scrolling.

## 3. The ViewModel survives configuration changes

`PayMatrixViewModel` holds one immutable `PayMatrixState` in a `StateFlow`. Screens collect it with lifecycle awareness. A rotation recreates the Activity but retains the ViewModel and its current state.

The ViewModel translates user intent—"create group", "save expense", "accept friend"—into repository calls. It also turns exceptions into one user-visible error surface.

## 4. Domain code owns financial correctness

Money is converted to integer paise at the form boundary. `₹100.00` becomes `10000`. Addition and allocation happen on integers, avoiding floating-point accumulation.

The allocation algorithm floors every proportional share, ranks fractional remainders, then distributes leftover paise deterministically. This guarantees that all splits add back to the exact bill total.

`BalanceEngine` then:

1. Credits the payer for every other participant's split.
2. Debits each participant by that split.
3. Applies only confirmed, non-deleted settlements.
4. Matches the largest debtor and creditor until balances are simplified.

These rules mirror `frontend/src/utils/balanceEngine.js` and are covered by Kotlin unit tests.

## 5. Repositories isolate Firebase

The UI knows about `Group`, `Expense` and `Settlement`; it does not know collection paths. `FirebaseRepository` owns paths and document compatibility.

For an expense, the current Firestore rules require an audit document to exist after the write and require matching mutation IDs/types. The repository pre-generates both IDs and commits both documents with `runBatch`.

Firestore's Android SDK provides a persistent local cache. Reads can be served locally, and eligible writes queue until connectivity returns. Confirmed settlements deliberately perform a server read first because the user must not finalize payment state from an unverified offline session.

## 6. Google authentication

Credential Manager displays accounts already present on Android. It returns a Google ID token. Firebase Auth verifies that token and creates the same Firebase session/user UID used by the web app.

Two Android registrations exist in the same Firebase project:

- `com.paymatrix.app`: release/update client
- `com.paymatrix.app.native.dev`: side-by-side development client

Each package and signing SHA must be registered. A package/SHA mismatch commonly appears as Google sign-in error 10.

## 7. Push, camera and UPI are native

- `FirebaseMessagingService` receives background messages without JavaScript.
- Camera permission is requested only when the user taps the scanner.
- The captured bitmap is compressed before upload and authorized with a Firebase ID token.
- UPI uses an Android `ACTION_VIEW` intent. Intent completion is never treated as payment confirmation.

## 8. Building and releasing

Gradle compiles Kotlin, Compose resources and Firebase dependencies into DEX bytecode and packages them into an APK.

The project intentionally uses the April 2026 stable Compose BOM because the August line requires API 37/AGP 9.1 while the established paymatrix toolchain currently compiles against API 36. AGP 8.13.2 is used because it includes the R8 version required for Kotlin 2.3 metadata.

Debug uses the standard debug key and `.native.dev` suffix. Release removes the suffix, enables R8/resource shrinking and must use the established paymatrix release key.

For update compatibility Android checks:

1. package name matches;
2. signing certificate matches;
3. new version code is higher.

Firebase CLI participates only around the app: registrations/config, emulator/rules verification, and optional App Distribution upload.
