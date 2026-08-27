# How the native migration works

## 1. What was kept

Firebase is the shared backend. Both the older Capacitor client and this native client read and write the same authenticated users, groups, expenses, settlements, logs, and feature configuration. The financial rules and Firestore field meanings therefore stay compatible.

## 2. What was replaced

The old APK displayed React inside Android's WebView through Capacitor. The new APK renders each screen with Jetpack Compose. Navigation, lists, dialogs, camera access, notifications, Google credentials, image loading, caching, and lifecycle handling now use Android APIs directly.

## 3. Data flow

`Compose screen → PayMatrixViewModel → FirebaseRepository/AuthRepository → Firebase`

Repository results are converted into Kotlin models. The ViewModel exposes one observable screen state. Compose redraws only the UI affected by a state change. Firestore listeners refresh home/group state, while Coil loads and caches Google avatar URLs.

## 4. Why the upgrade works

Android accepts an update only when:

1. The package name is unchanged: `com.paymatrix.app`.
2. The new APK is signed by the same release certificate as v1.2.5.
3. The version code increases: v2.0.1 uses `20100`.

Because those conditions hold, `adb install -r` and normal Android installation can replace v1.2.5 without creating a second app entry.

## 5. Why it should feel faster

There is no JavaScript bundle startup or WebView layout pass. Compose uses lazy lists, state-driven recomposition, native image caching, and Android lifecycle integration. Real performance still depends on device hardware, network latency, Firestore query cost, and image servers, so profiling on the intended phones remains valuable.

## 6. Release safety

The GitHub release is published as a prerelease named `paymatrix 2.0.1`, not as beta-branded software. Its notes explicitly say it may contain bugs and link users to report them. The v1.2.5 release is not deleted or overwritten.
