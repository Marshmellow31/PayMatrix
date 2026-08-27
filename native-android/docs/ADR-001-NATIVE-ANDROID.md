# ADR-001: Native Android client

**Status:** Accepted for production migration in v2.0.1

## Decision

Use Kotlin and Jetpack Compose for the Android presentation and device integration layers while preserving the existing Firebase project, Firestore contract, authentication accounts, Cloud/API behavior, and financial calculations.

The native client uses the production package `com.paymatrix.app`, version code `20100`, and the v1.2.5 release key. This makes v2.0.1 an in-place Android upgrade instead of a second side-by-side application.

## Why

Compose removes the browser/WebView layer, gives direct lifecycle and navigation control, improves list rendering and startup behavior, and provides first-class Android camera, notification, deep-link, and credential APIs.

## Consequences

- The React/Capacitor source remains in the repository and the v1.2.5 GitHub release remains downloadable.
- Installing v2.0.1 replaces an installed v1.2.5 because Android sees the same signed application with a higher version code.
- A rollback to v1.2.5 requires uninstalling v2.0.1, which can clear local-only app data; cloud data remains in Firebase.
- Device/account testing is still required before describing the build as bug-free.
