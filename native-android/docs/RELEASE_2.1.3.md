# paymatrix Android 2.1.3 release record

## Scope

Version 2.1.3 packages the completed native Android responsiveness and UI-polish work on top of 2.1.2. It preserves package `com.paymatrix.app`, Firebase compatibility, integer-paise financial behavior, and the established release signing identity.

### Product and reliability changes

- Adds reusable shimmer skeletons for group details and receipt analysis while background reads complete.
- Keeps prior screen content visible during refreshes instead of replacing the entire app with a blocking loading overlay.
- Caches group snapshots and reduces repeated profile and group reads during navigation.
- Improves group, expense, activity, navigation, and confirmation layouts across the native Compose client.
- Makes date parsing resilient to ISO instants, offset timestamps, local timestamps, and epoch-millisecond values.
- Keeps receipt images behind the authenticated Vercel scanner proxy. No Gemini credential is embedded in the APK.

## Verification completed on 3 September 2026

- Frontend: ESLint, Prettier check, 31 unit tests, serverless-function syntax, and production Vite/PWA build passed.
- Firestore authorization emulator: 21 tests passed, 0 failed.
- Android: unit tests, release lint, R8/resource shrinking, signed APK, and signed AAB passed.
- Android lint: 0 errors and 39 non-blocking warnings.
- Identity: `com.paymatrix.app`, version `2.1.3` (`21003`), min SDK 24, target SDK 36, app label `paymatrix`.
- APK Signature Scheme v2 verification passed. Certificate SHA-256 is `77bc53c8e4c6eeb17449750b0bd1d83901682030219e8a363963428e9820659f`, matching the prior native release.
- APK 16 KiB alignment verification passed.
- APK SHA-256: `e162238b48285bbcfb69a3cbc79e53781e05efe180064a1dd32a7251db6958c4`.
- AAB SHA-256: `1f6d28f2f4ad2cf102dfd65ee71f9fb86f6c53b9310c79e564096f6fbaa598bc`; JAR signature verification passed.

## Remaining external gates

Google Play Console declarations, reviewer access, store screenshots, Play App Signing/Firebase certificate registration, internal testing, the closed-test requirement, and physical-device accessibility/payment checks remain separate publication gates.
