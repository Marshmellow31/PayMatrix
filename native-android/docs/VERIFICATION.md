# Native 2.0.1 verification record

## Release identity

- Artifact: `releases/paymatrix-native-2.0.1.apk`
- App label: `paymatrix`
- Package: `com.paymatrix.app`
- Version: `2.0.1` (`20100`)
- Firebase app ID: `1:344969363066:android:f200bee5cbcf086a3305c3`

## Automated checks

Completed on 2026-08-27:

- Kotlin unit tests and debug compilation: passed
- Signed release compilation with R8/resource shrinking and release lint: passed
- APK signing: passed; signer SHA-256 `77bc53c8e4c6eeb17449750b0bd1d83901682030219e8a363963428e9820659f`
- v1.2.5 signer comparison: exact certificate match
- Package inspection: `com.paymatrix.app`, `2.0.1`, code `20100`
- SHA-256: `5446994f377951ffbd11111264022187d497c35fddaec1a5d59d2b13905b407c`
- Firestore emulator authorization suite: 16 passed, 0 failed
- Emulator upgrade: `adb install -r` returned `Success`; version changed from `1.2.5` (`10205`) to `2.0.1` (`20100`) while `firstInstallTime` remained unchanged
- Cold launch after upgrade: process started without a fatal Android exception

## Human device checks still recommended

- Google sign-in and profile photo on a real account
- Friends/profile photos after cold start and offline cache use
- Every bottom tab, especially returning to Home
- Group create/join/edit/member/expense/settlement/log/insight flows
- Camera permission and receipt scanning
- Notification permission and delivery
- UPI app launch plus bank-history confirmation before recording

Passing a build and emulator upgrade check does not by itself prove every external account, bank app, camera, or notification provider behaves correctly on every physical phone.
