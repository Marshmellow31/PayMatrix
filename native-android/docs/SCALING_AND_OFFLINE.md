# Scaling and offline architecture

## What version 2.1.0 changes

The Home dashboard no longer builds its totals from complete `GroupSnapshot` objects. A dashboard refresh reads only each active group's expense and settlement collections. It no longer reads up to 100 audit events or every member profile as a side effect of computing the Home balance. Other members' denied private-profile lookups were also removed; only the signed-in user's private profile is read.

Global notifications are capped at 30 and cross-group Activity is capped at 20 events per group and 50 events overall. Group detail still loads the complete ledger because balances must remain exact.

Version 2.1.0 also removes duplicate startup refreshes. The Home listener ignores its initial snapshot because the session bootstrap has already loaded the same data, and notification or feature-flag changes no longer recompute every group balance.

This materially reduces amplification but is not the final architecture for very large groups. Before thousands of daily active users, add trusted server-maintained per-user/group balance summaries, cursor pagination, budget alerts, App Check enforcement, and measured load tests. Do not let an untrusted client author an authoritative aggregate without rules or backend verification.

## Firebase capacity decision

The app can launch on the no-cost Firebase tier, but the Spark plan is not a safe mass-adoption plan. As of 1 September 2026, the standard Firestore free quota is 50,000 document reads/day, 20,000 writes/day, 20,000 deletes/day, 1 GiB stored data, and 10 GiB/month outbound transfer. Spark stops the affected paid-tier Firebase product after its no-cost allowance is exhausted; Blaze retains the no-cost allowance and charges for additional usage.

Dashboard cost is proportional to retained ledger size because exact balances currently read every expense and settlement in each active group. For planning, a user with 100 expenses and 20 settlements across their groups costs roughly 120 document reads for one fresh summary before group/profile/notification reads. Five uncached opens per day would consume roughly 600 reads for that user, so even around 80 similarly active users can approach the 50,000-read daily free quota. This is a deliberately conservative estimate; actual billing depends on cache state, listeners, group overlap, and behavior.

Before a public marketing push:

1. Confirm the project's current Spark/Blaze status in Firebase Console.
2. Move to Blaze only after creating billing budgets and alerts; a budget alert is not a hard spending cap.
3. Add trusted materialized balance/month-summary documents so Home is O(groups), not O(all historical ledger documents).
4. Paginate group detail, spending logs, and exports, while keeping financial totals server-maintained and exact.
5. Load-test representative shared groups and alert on Firestore read/write rate, function errors, Crashlytics, and App Check rejection rate.

## Offline behavior

Cloud Firestore uses persistent local caching. Version 2.1.0 treats supported expense and spending-log batch writes as durable pending mutations when the network is unavailable or a server acknowledgement exceeds 12 seconds. The UI returns immediately, displays a pending-sync banner, and Firestore retries the mutation when connectivity returns.

Supported while offline when the required group data has already been cached:

- Browse previously loaded Home, group, expense, settlement, Activity, and spending-log data.
- Add or edit an expense.
- Delete or restore an expense with its atomic audit event.
- Add, edit, or delete a spending-log entry with its immutable activity event.
- Add an existing cached expense share to a spending log.

Connection required:

- Google sign-in and account deletion/reauthentication.
- Friend requests, group invitations, membership, and profile changes.
- Receipt AI extraction.
- Settlement confirmation and UPI-dependent workflows.
- Data export when uncached history must be fetched.

Settlement confirmation intentionally performs a server read and refuses offline operation. Opening a payment app never proves money moved; the user must verify the transfer in UPI or bank history before recording the settlement.

## Operational checks

1. Verify the live Firebase billing plan in Console.
2. Record reads/writes per active user after the Internal testing cohort starts.
3. Set budget alerts before any Blaze upgrade.
4. Register App Check signing certificates, observe metrics, then enable enforcement gradually.
5. Add server-maintained balance summaries before marketing to high-volume groups.
