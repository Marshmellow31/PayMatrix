# Google Play Data Safety working sheet

Complete the Play Console form against the final SDK dependency report. This sheet describes version 2.1.0; it is not a substitute for the Console declaration.

## Security and handling

- Data is encrypted in transit with HTTPS/TLS.
- Users can request deletion in the app and at https://pay-matrix.vercel.app/delete-account.
- The app contains no advertising SDK and does not sell user data.
- Firebase App Check is bundled. Play Integrity registration and enforcement must be completed in Firebase/Play Console only after both signing certificates are registered.

## Data types

| Play category | Examples in paymatrix | Collected | Shared with a service provider | Required / optional | Purpose |
| --- | --- | --- | --- | --- | --- |
| Name | Google display name, chosen profile name | Yes | Firebase | Required for account/group identity | App functionality, account management |
| Email address | Google account email | Yes | Firebase Authentication | Required for sign-in | Authentication, account management |
| User IDs | Firebase UID, friend code | Yes | Firebase | Required | Authentication, fraud prevention, app functionality |
| Phone number | Optional profile phone | Optional | Firebase | Optional | User-selected profile information |
| Photos | Google profile photo URL | Optional | Firebase/Google | Optional | Member identity |
| Photos or videos | Receipt image selected for Scan Bill | User initiated, transient processing | Hosting endpoint and Google Gemini | Optional | Receipt extraction requested by the user |
| Financial information | Expenses, amounts, splits, categories, settlements, UPI ID | Yes | Firebase | Core records required; UPI ID optional | App functionality |
| Other user-generated content | Group names, notes, places, log entries | Yes | Firebase | Optional except required transaction fields | App functionality |
| App interactions | Screen/network performance measurements | Yes | Firebase Performance | Automatic, users can stop by uninstalling | Analytics and app reliability |
| Crash logs and diagnostics | Crash traces, app/device/OS version | Yes | Firebase Crashlytics | Automatic | App reliability and debugging |
| Device or other IDs | Firebase installation and push token | Yes | Firebase | Push token optional | Notifications, security, diagnostics |

## Retention notes

- Profile identifying data is anonymized immediately after an authenticated deletion request.
- Shared ledger documents and UID references can remain where removal would corrupt another member's financial history; the displayed identity becomes `Deleted user`.
- A non-personal deletion receipt is retained for 30 days.
- Original receipt images are not intentionally written to Firestore by the client. The selected image is processed only when the user invokes receipt scanning.
