# ADR-003: Firestore is the Android offline ledger

- Status: Accepted
- Date: 2026-08-23

## Context

PayMatrix must permit safe expense work while offline, synchronize after reconnection, isolate data between accounts, and avoid duplicated financial writes. A second independent SQLite/Dexie ledger would require two-way reconciliation with Firestore and could replay the same expense twice.

## Decision

Use Firestore persistent IndexedDB as the canonical local database for the React/Capacitor application. Financial writes use atomic Firestore batches and stable operation identifiers. A small UID-scoped local sync tracker records only pending-operation metadata; it does not duplicate financial payloads.

Expense records carry monotonically increasing versions. Security rules require `newVersion = oldVersion + 1`, so competing offline edits cannot silently overwrite each other. Settlement confirmation requires an online server read and is never finalized from offline state. Firestore persistence and all in-memory/user-scoped caches are cleared on logout.

## Consequences

- Previously loaded groups and expenses remain available offline.
- Safe expense writes queue locally and sync automatically.
- Users see offline and pending-sync state.
- Conflicting edits fail and must be reviewed instead of using last-write-wins.
- Settlement confirmation cannot be used offline.
- The app avoids maintaining a second financial source of truth.

## Alternatives considered

- Separate SQLite/Dexie financial ledger: rejected for v1 because duplicate-write and reconciliation risk exceeds its benefit.
- Online-only application: rejected because it does not meet the mobile product requirement.
- Server-owned command queue: preferred at larger scale, but unavailable while the project remains on Firebase Spark without a trusted deployed backend.
