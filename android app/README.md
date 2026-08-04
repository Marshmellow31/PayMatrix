# PayMatrix Android

This folder owns the native Android wrapper, generated Gradle project, build scripts, and Android
release documentation. The canonical React application remains in `../frontend`; normal web and PWA
commands are unchanged.

## Documentation

Start with [00-GOALS-AND-SCOPE.md](docs/00-GOALS-AND-SCOPE.md), then follow the numbered guides in
`docs/`. Firebase setup and the exact native Google sign-in requirements are in
[03-NATIVE-AUTH-AND-FIREBASE.md](docs/03-NATIVE-AUTH-AND-FIREBASE.md). The current implementation,
test evidence, artifacts, and remaining release gates are tracked in
[09-IMPLEMENTATION-STATUS.md](docs/09-IMPLEMENTATION-STATUS.md).

## Commands

Run these from this folder:

```powershell
npm ci
npm run doctor
npm run android:apk
```

The debug APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

For a Play Store bundle, configure `android/key.properties` and the release keystore first, then run:

```powershell
npm run android:aab
```

The release AAB is generated at `android/app/build/outputs/bundle/release/app-release.aab`.

## Required local Firebase file

`android/app/google-services.json` is intentionally ignored because it is environment-specific. The
local workspace already contains the generated configuration for package `com.paymatrix.app` in
Firebase project `paymatrix-174b5`, and both debug and release compilation have validated it. A clean
checkout must download the same app configuration from Firebase Console and place it at that path.
