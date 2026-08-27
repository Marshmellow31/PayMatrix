# Native 2.0.2 verification record

## Release identity

- Artifact: `releases/paymatrix-native-2.0.2.apk`
- App label: `paymatrix`
- Package: `com.paymatrix.app`
- Version: `2.0.2` (`20200`)
- Firebase app ID: `1:344969363066:android:f200bee5cbcf086a3305c3`

## Automated checks

Completed on 2026-08-27:

- Kotlin unit tests and debug compilation: passed
- Signed release compilation with R8/resource shrinking and release lint: passed
- APK signing: passed; signer SHA-256 `77bc53c8e4c6eeb17449750b0bd1d83901682030219e8a363963428e9820659f`
- v1.2.5 signer comparison: exact certificate match
- Package inspection: `com.paymatrix.app`, `2.0.2`, code `20200`
- SHA-256: `41d79818a1f0add16df08f7476556d7bf918e753d0adb7d3933bf99c15bae0d1`
- Firestore emulator authorization suite: 16 passed, 0 failed
- Release dependency graph: `coil-network-okhttp:3.3.0` and `coil-network-core:3.3.0` present with OkHttp 5.1.0
- Emulator upgrade: `adb install -r` returned `Success`; version changed from `2.0.1` (`20100`) to `2.0.2` (`20200`) while `firstInstallTime` remained `2026-08-26 21:39:01`
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
