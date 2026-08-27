# paymatrix 2.0 beta

This is the first feature-complete native Android beta, rebuilt in Kotlin and Jetpack Compose while retaining the existing Firebase backend and financial data contract.

## Install safely beside the current app

The beta package is `com.paymatrix.app.native.beta`; the current Capacitor app remains `com.paymatrix.app`. Android keeps their installations and local storage separate, while both connect to the same paymatrix account and backend.

## Included

- Native Google/Firebase sign-in and Google profile avatars
- Dashboard, friends, groups, expenses, settlements, activity, analytics, notifications, logs, profile, privacy, scanner, join links, account deletion, and claim-protected admin pages
- Equal, exact, percentage, shares, and itemized/GST split modes
- Real-time Firestore updates plus offline cache and connection feedback
- Full-resolution native camera/gallery receipt flow and authenticated scanner request
- Native FCM and UPI intents with explicit payment-verification safeguards
- Remote feature flags and maintenance mode
- R8/resource optimization, parallel dashboard reads, stable lazy-list keys, avatar memory/disk caching, and a startup baseline profile

## Beta boundary

The automated build, financial tests, Firestore rule tests, APK inspection, and side-by-side emulator install pass. Google account data, real camera/scanner, FCM, UPI/bank verification, and performance across physical phones must still be exercised before the Capacitor release is retired.

SHA-256: `ef3ac44cc375204ad51693b06cac54ffd2507908d1ef24ea6954aa9dcd7169fd`
