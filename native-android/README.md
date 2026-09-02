# paymatrix native Android 2.1.1

This folder contains the fully native Kotlin and Jetpack Compose Android client. It does not embed the React site, Capacitor, or a WebView. It keeps the existing Firebase project, Firestore documents, sign-in accounts, group balances, expenses, settlements, logs, notifications, and scanner API.

## Release identity

- App name: `paymatrix`
- Package: `com.paymatrix.app`
- Version: `2.1.1` (`21001`)
- Firebase Android app: `1:344969363066:android:f200bee5cbcf086a3305c3`
- Release signing: the same release keystore used by v1.2.5

Those three Android compatibility keys—package name, signing certificate, and a higher version code—allow Android to upgrade earlier releases in place while keeping app data.

## Build

Use Android Studio's bundled JDK and the installed Android SDK:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
.\gradlew.bat testDebugUnitTest assembleDebug
.\gradlew.bat assembleRelease bundleRelease
```

The signed release APK is generated under `app/build/outputs/apk/release/`. The signed Android App Bundle under `app/build/outputs/bundle/release/` is the Play Console upload artifact.

## Important safety behavior

- A UPI intent only opens a payment app; it does not prove that money moved.
- paymatrix records a settlement only after the user confirms they checked the successful payment in their UPI or bank history.
- QR/manual fallback remains available.
- The native app contains no administrator console, route, repository, or privileged mutation UI.
- Supported expense and spending-log edits use Firestore's platform-protected cache and durable mutation queue when offline. Authentication, invitations, AI scanning, and settlement confirmation remain online-only.
- Expense, settlement, and spending-log mutations write immutable audit events in the same atomic batch. Spending-log groups are archived rather than hard-deleted so their activity history remains exportable.

See [LEARNING_GUIDE.md](docs/LEARNING_GUIDE.md), [FEATURE_PARITY.md](docs/FEATURE_PARITY.md), [SCALING_AND_OFFLINE.md](docs/SCALING_AND_OFFLINE.md), and [RELEASE_2.1.0.md](docs/RELEASE_2.1.0.md).
