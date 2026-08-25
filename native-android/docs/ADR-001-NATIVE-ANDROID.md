# ADR-001: Replace the Android WebView client with Kotlin and Jetpack Compose

**Status:** Accepted for an isolated preview
**Date:** 2026-08-26
**Decider:** PayMatrix owner

## Context

The released Android APK embeds the React/Vite app through Capacitor. The backend is already Firebase and is independently usable by Android SDK clients. The goal is maximum Android UI performance without migrating user data or breaking the web PWA.

## Decision

Build an isolated Kotlin/Jetpack Compose app in `native-android/`. Retain the Firebase project, Firestore contract, Cloud Functions, production application ID and signing identity. Use a separate debug Firebase registration and application suffix so old and new clients can coexist during validation.

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
- Admin operations remain web-first because they are operational tooling, not a consumer mobile performance path.

## Release gate

Do not replace the public APK until update installation, Google sign-in, Firestore rule compatibility, offline behavior, FCM, camera, notch handling and 60/90/120 Hz journeys pass on physical devices.
