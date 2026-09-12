# paymatrix native Android

This is the Kotlin and Jetpack Compose client for paymatrix. It shares the existing Firebase project and financial ledger with the web app, while keeping a separate native UI.

## Release identity

- App label: `paymatrix`
- Package: `com.paymatrix.app`
- Version: `2.3.3` (`versionCode 23003`)
- Signing: the existing release keystore configured in the local, ignored `key.properties`

Keep the package, signing certificate, Firebase configuration, and monotonically increasing version code when upgrading existing installations. Do not commit `key.properties`, keystores, or local Firebase configuration.

## Build and verify on Windows

Install Android SDK 36 and use Android Studio's bundled JDK. Place this project's Android `google-services.json` at `app/google-services.json` and configure the existing release keystore in `key.properties`.

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
.\gradlew.bat :app:testDebugUnitTest :app:lintRelease :app:assembleRelease :app:bundleRelease
```

The signed APK is generated at `app/build/outputs/apk/release/app-release.apk`; the signed Android App Bundle is at `app/build/outputs/bundle/release/app-release.aab`. Copies of the current artifacts and their checksums are in [`releases/`](releases/). The AAB requires Google Play processing and cannot be installed directly like an APK.

The release uses the app's existing Firebase backend. A successful build or emulator run does not verify Play distribution, real-device sign-in, or a completed UPI payment. Keep QR/manual fallback and record settlement only after the user confirms it in their payment app or bank history.
