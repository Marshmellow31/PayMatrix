# ADR-001: Replace the Android WebView client with Kotlin and Jetpack Compose

**Status:** Accepted for an isolated beta
**Date:** 2026-08-26
**Decider:** PayMatrix owner

## Context

The released Android APK embeds the React/Vite app through Capacitor. The backend is already Firebase and is independently usable by Android SDK clients. The goal is maximum Android UI performance without migrating user data or breaking the web PWA.

## Decision

Build an isolated Kotlin/Jetpack Compose app in `native-android/`. Retain the Firebase project, Firestore contract and Cloud Functions, but use the dedicated package `com.paymatrix.app.native.beta` and its own Firebase Android registration. Keep `com.paymatrix.app` on Capacitor until native parity is proven.

## Options considered

| Option | UI performance | Existing React UI reuse | Backend reuse | Migration cost |
|---|---:|---:|---:|---:|
| Optimize Capacitor | Medium | Complete | Complete | Low |
| React Native | High | Logic only | Complete | Medium-high |
| Flutter | High | None | Complete | High |
| Kotlin + Compose | Highest Android integration | None | Complete | High |

## Consequences

- Native startup, scrolling, back gestures, camera, notifications and UPI intents no longer pass through a WebView bridge.
- React components, Redux and browser-only libraries are not reusable.
- Pure financial algorithms are ported to Kotlin and checked with parity tests.
- The web PWA and Capacitor APK remain available until physical-device feature parity is proven.
- Claim-protected admin operations are also available natively for parity; their Cloud Functions and authorization model remain unchanged.
- The beta does not qualify as an in-place update. That is intentional: both APKs can remain installed and live during validation.

## Release gate

Do not retire the public Capacitor APK until Google sign-in, existing-account data, Firestore rules, offline recovery, FCM, camera, UPI confirmation, notch handling and 60/90/120 Hz journeys pass on physical devices.
