# Google Play Data Safety Working Notes

This document is an implementation inventory, not legal advice. Confirm the final binary, production configuration, and current Play Console wording before submission.

| Data type | Collected | Shared with processor | Purpose | Required | User deletion |
| --- | --- | --- | --- | --- | --- |
| Name, email, Firebase UID | Yes | Google Firebase | Account and authentication | Account required | Email/name removed; UID may remain in shared ledger |
| Profile photo | Optional | Google Firebase | Member identification | Optional | Removed on deletion |
| Friend relationships and group membership | Yes | Google Firebase | App functionality | Optional/feature dependent | Friend list removed; historical group UID may remain |
| Expenses, splits, notes and settlements | Yes | Google Firebase | Financial ledger functionality | Feature dependent | Shared records retained and identity anonymized |
| UPI ID | Optional | Google Firebase | Display/copy/QR settlement assistance | Optional | Removed on deletion |
| Push token | Optional | Google Firebase/FCM | User-requested notifications | Optional | Removed on opt-out/logout/deletion where reachable |
| Receipt images | User initiated, transient | Google Gemini | Receipt extraction | Optional | Not intentionally persisted by PayMatrix |
| AI request counters | Yes | Google Firebase | Abuse prevention | Required for scanner | UID-scoped operational record |
| Audit activity | Yes | Google Firebase | Integrity, fraud prevention and support | Required for shared ledger | Shared history retained with anonymized identity |
| Device/app diagnostics | Limited local/platform logs | Android/Firebase platform as configured | Reliability and security | Operational | Subject to provider controls |

Production traffic is intended to use encryption in transit through HTTPS/TLS. Do not select any Play declaration claiming end-to-end encryption, total anonymity, or no sharing: those claims are not accurate for the implemented architecture.
